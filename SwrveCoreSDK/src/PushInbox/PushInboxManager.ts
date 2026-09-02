import { EventFactory } from "../Events/EventFactory";
import IRestClient from "../interfaces/IRestClient";
import {
  ISwrvePushInboxMessage,
  ISwrvePushInboxMessageRaw,
  ISwrvePushInboxResult,
  OnPushInboxOperationComplete,
  SwrvePushInboxId,
  SwrvePushInboxMessageState,
  SwrvePushInboxResultCode,
} from "../interfaces/IPushInbox";
import { StorageManager } from "../Storage/StorageManager";
import SwrveEvent from "../WebApi/Events/SwrveEvent";
import IGenericCampaignEvent from "../interfaces/IGenericCampaignEvent";
import {
  PUSH_INBOX,
  PUSH_INBOX_HASH,
} from "../utils/SwrveConstants";

type QueueEvent = (event: SwrveEvent) => void;
type SendQueuedEvents = () => void;
type NextSequenceNumber = () => number;
type QALogEvent = (event: IGenericCampaignEvent) => void;

export class PushInboxManager {
  private readonly maxAttempts = 3;
  private messagesList: ISwrvePushInboxMessage[] = [];

  public constructor(
    private readonly storageManager: StorageManager,
    private readonly restClient: IRestClient,
    private readonly eventFactory: EventFactory,
    private readonly getUserId: () => string,
    private readonly getApiKey: () => string,
    private readonly getContentUrl: () => string,
    private readonly nextSequenceNumber: NextSequenceNumber,
    private readonly queueEvent: QueueEvent,
    private readonly sendQueuedEvents: SendQueuedEvents,
    private readonly qaLogEvent?: QALogEvent
  ) {
    this.loadFromStorage();
  }

  public updatePushInbox(
    inboxMessages?: ReadonlyArray<ISwrvePushInboxMessageRaw>
  ): void {
    if (!inboxMessages) {
      return;
    }

    this.messagesList = inboxMessages
      .map((message) => this.parseMessage(message))
      .filter((message): message is ISwrvePushInboxMessage => message !== null);

    this.storageManager.saveData(
      this.inboxStorageKey(),
      JSON.stringify(inboxMessages)
    );
  }

  public messages(): ISwrvePushInboxMessage[] {
    return this.messagesList.slice();
  }

  public filteredMessages(): ISwrvePushInboxMessage[] {
    const now = Date.now();
    return this.messagesList.filter((message) => message.endDate >= now);
  }

  public getPushInboxMessage(messageId: SwrvePushInboxId): ISwrvePushInboxMessage | null {
    const id = String(messageId);
    return this.messagesList.find((message) => message.messageId === id) || null;
  }

  public async readMessage(
    messageId: SwrvePushInboxId,
    listener?: OnPushInboxOperationComplete
  ): Promise<ISwrvePushInboxResult> {
    const result = await this.updateMessageState(messageId, "R");
    if (result.resultCode === SwrvePushInboxResultCode.SUCCESS) {
      this.updateSuccess(messageId, SwrvePushInboxMessageState.READ, result.modified);
    }
    return this.complete(listener, messageId, result);
  }

  public async engageMessage(
    messageId: SwrvePushInboxId,
    listener?: OnPushInboxOperationComplete
  ): Promise<ISwrvePushInboxResult> {
    const message = this.getPushInboxMessage(messageId);
    if (message) {
      this.sendEvent("engaged", message);
    }
    return this.readMessage(messageId, listener);
  }

  public async deleteMessage(
    messageId: SwrvePushInboxId,
    listener?: OnPushInboxOperationComplete
  ): Promise<ISwrvePushInboxResult> {
    const result = await this.updateMessageState(messageId, "D");
    if (result.resultCode === SwrvePushInboxResultCode.SUCCESS) {
      this.updateSuccess(messageId, SwrvePushInboxMessageState.DELETED, result.modified);
    }
    return this.complete(listener, messageId, result);
  }

  public getStoredHash(): string | null {
    return this.storageManager.getData(this.hashStorageKey());
  }

  public storeHash(hash: string): void {
    this.storageManager.saveData(this.hashStorageKey(), hash);
  }

  public loadFromStorage(): void {
    const stored = this.storageManager.getData(this.inboxStorageKey());
    if (!stored) {
      this.messagesList = [];
      return;
    }

    try {
      const raw = JSON.parse(stored) as ReadonlyArray<ISwrvePushInboxMessageRaw>;
      this.messagesList = raw
        .map((message) => this.parseMessage(message))
        .filter((message): message is ISwrvePushInboxMessage => message !== null);
    } catch {
      this.messagesList = [];
    }
  }

  private parseMessage(
    message: ISwrvePushInboxMessageRaw
  ): ISwrvePushInboxMessage | null {
    const state = String(message.state || "").toUpperCase();
    if (state !== "U" && state !== "R") {
      return null;
    }

    return {
      messageId: String(message.message_id),
      variantId: String(message.variant_id),
      state: state === "U"
        ? SwrvePushInboxMessageState.UNREAD
        : SwrvePushInboxMessageState.READ,
      customerJson: message.customer_json,
      sentDate: Number(message.sent_date),
      endDate: Number(message.end_date),
      trackingData: message.mg_tracking_data || "",
    };
  }

  private async updateMessageState(
    messageId: SwrvePushInboxId,
    state: "R" | "D"
  ): Promise<ISwrvePushInboxResult & { modified?: boolean }> {
    const body = new URLSearchParams({
      user: this.getUserId(),
      api_key: this.getApiKey(),
      state,
      message_id: String(messageId),
    }).toString();
    const path = `${this.getContentUrl()}/api/1/push_inbox_update`;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        const response = await this.restClient.postForm<any>(path, body);
        return {
          resultCode: SwrvePushInboxResultCode.SUCCESS,
          errorMessage: "",
          httpResponseCode: 200,
          modified: response.data && response.data.state === "modified",
        };
      } catch (error) {
        const status = (error && ((error as any).code || (error as any).status)) || 0;
        const shouldRetry = (status === 0 || status === 429 || status >= 500) &&
          attempt < this.maxAttempts;
        if (!shouldRetry) {
          return {
            resultCode: SwrvePushInboxResultCode.ERROR,
            errorMessage:
              "Push Inbox Message " +
              messageId +
              " failed to update. Server response code:" +
              status,
            httpResponseCode: status,
          };
        }
      }
    }

    return {
      resultCode: SwrvePushInboxResultCode.ERROR_UNKNOWN,
      errorMessage: "Push Inbox Message " + messageId + " failed to update.",
      httpResponseCode: 0,
    };
  }

  private updateSuccess(
    messageId: SwrvePushInboxId,
    state: SwrvePushInboxMessageState,
    modified?: boolean
  ): void {
    const message = this.getPushInboxMessage(messageId);
    if (!message) {
      return;
    }

    if (modified && state === SwrvePushInboxMessageState.READ) {
      this.sendEvent("read", message);
    } else if (modified && state === SwrvePushInboxMessageState.DELETED) {
      this.sendEvent("delete", message);
    }

    if (state === SwrvePushInboxMessageState.READ) {
      message.state = SwrvePushInboxMessageState.READ;
    } else if (state === SwrvePushInboxMessageState.DELETED) {
      const id = String(messageId);
      this.messagesList = this.messagesList.filter(
        (inboxMessage) => inboxMessage.messageId !== id
      );
    }

    this.persistCurrentMessages();
  }

  private sendEvent(
    actionType: "read" | "engaged" | "delete",
    message: ISwrvePushInboxMessage
  ): void {
    const payload: { [key: string]: string } = {
      messageId: String(message.messageId),
    };

    if (actionType !== "read") {
      payload.state =
        message.state === SwrvePushInboxMessageState.READ ? "read" : "unread";
    }

    if (message.trackingData) {
      payload.trackingData = message.trackingData;
    }

    const evt = this.eventFactory.getGenericCampaignEvent(
      this.nextSequenceNumber(),
      "push_inbox",
      actionType,
      String(message.variantId),
      undefined,
      payload
    );
    this.queueEvent(evt);
    if (this.qaLogEvent) {
      this.qaLogEvent(evt);
    }
    this.sendQueuedEvents();
  }

  private complete(
    listener: OnPushInboxOperationComplete | undefined,
    messageId: SwrvePushInboxId,
    result: ISwrvePushInboxResult
  ): ISwrvePushInboxResult {
    if (listener) {
      listener(messageId, result);
    }
    return result;
  }

  private persistCurrentMessages(): void {
    const rawMessages = this.messagesList.map((message) => ({
      message_id: message.messageId,
      variant_id: message.variantId,
      state: message.state === SwrvePushInboxMessageState.READ ? "R" : "U",
      customer_json: message.customerJson,
      sent_date: message.sentDate,
      end_date: message.endDate,
      mg_tracking_data: message.trackingData,
    }));

    this.storageManager.saveData(this.inboxStorageKey(), JSON.stringify(rawMessages));
  }

  private inboxStorageKey(): string {
    return PUSH_INBOX + this.getUserId();
  }

  private hashStorageKey(): string {
    return PUSH_INBOX_HASH + this.getUserId();
  }
}
