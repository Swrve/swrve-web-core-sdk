import { EventFactory } from "../src/Events/EventFactory";
import { PushInboxManager } from "../src/PushInbox/PushInboxManager";
import { StorageManager } from "../src/Storage/StorageManager";
import {
  ISwrvePushInboxMessageRaw,
  SwrvePushInboxMessageState,
  SwrvePushInboxResultCode,
} from "../src/interfaces/IPushInbox";
import SwrveEvent from "../src/WebApi/Events/SwrveEvent";
import PlatformMock, { clearLocalStorage } from "./mocks/PlatformMock";
import MockSwrveRestClient from "./mocks/MockSwrveRestClient";

class RecordingRestClient extends MockSwrveRestClient {
  public formPosts: Array<{ path: string; body: string }> = [];

  public async postForm<U>(path: string, body: string): Promise<any> {
    this.formPosts.push({ path, body });
    return await super.postForm<U>(path, body);
  }
}

describe("PushInboxManager", () => {
  let restClient: RecordingRestClient;
  let queuedEvents: SwrveEvent[];
  let sequenceNumber: number;
  let subject: PushInboxManager;

  const future = Date.now() + 100000;
  const past = Date.now() - 100000;
  const unreadMessage: ISwrvePushInboxMessageRaw = {
    message_id: 100,
    variant_id: 200,
    state: "U",
    customer_json: {
      title: "Title",
      body: "Body",
    },
    sent_date: past,
    end_date: future,
    mg_tracking_data: "tracking-data",
  };

  beforeEach(() => {
    clearLocalStorage(true);
    restClient = new RecordingRestClient({
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      json: () => ({ state: "modified" }),
      throwsNetworkError: () => {},
    });
    queuedEvents = [];
    sequenceNumber = 1;
    subject = new PushInboxManager(
      new StorageManager(new PlatformMock()),
      restClient,
      new EventFactory(),
      () => "user-1",
      () => "api-key",
      () => "https://content.example.com",
      () => sequenceNumber++,
      (event) => queuedEvents.push(event),
      () => undefined
    );
  });

  it("stores valid messages and filters expired messages", () => {
    subject.updatePushInbox([
      unreadMessage,
      {
        ...unreadMessage,
        message_id: 101,
        end_date: past,
      },
      {
        ...unreadMessage,
        message_id: 102,
        state: "D",
      },
    ]);

    expect(subject.messages()).toHaveLength(2);
    expect(subject.filteredMessages()).toHaveLength(1);
    expect(subject.filteredMessages()[0].messageId).toBe("100");
    expect(subject.filteredMessages()[0].state).toBe(
      SwrvePushInboxMessageState.UNREAD
    );
  });

  it("reads a message and queues the iOS-compatible read event", async () => {
    subject.updatePushInbox([unreadMessage]);

    const result = await subject.readMessage(100);

    expect(result.resultCode).toBe(SwrvePushInboxResultCode.SUCCESS);
    expect(subject.getPushInboxMessage(100)!.state).toBe(
      SwrvePushInboxMessageState.READ
    );
    expect(restClient.formPosts[0].path).toBe(
      "https://content.example.com/api/1/push_inbox_update"
    );
    expect(restClient.formPosts[0].body).toContain("user=user-1");
    expect(restClient.formPosts[0].body).toContain("api_key=api-key");
    expect(restClient.formPosts[0].body).toContain("state=R");
    expect(restClient.formPosts[0].body).toContain("message_id=100");
    expect((queuedEvents[0] as any).campaignType).toBe("push_inbox");
    expect((queuedEvents[0] as any).actionType).toBe("read");
    expect((queuedEvents[0] as any).id).toBe("200");
    expect((queuedEvents[0] as any).payload).toEqual({
      messageId: "100",
      trackingData: "tracking-data",
    });
  });

  it("preserves 64-bit message and variant ids when reading a message", async () => {
    const messageId = "3608592969879707351";
    const variantId = "3608592969879707352";
    subject.updatePushInbox([
      {
        ...unreadMessage,
        message_id: messageId,
        variant_id: variantId,
      },
    ]);

    const result = await subject.readMessage(messageId);

    expect(result.resultCode).toBe(SwrvePushInboxResultCode.SUCCESS);
    expect(subject.getPushInboxMessage(messageId)!.messageId).toBe(messageId);
    expect(restClient.formPosts[0].body).toContain(`message_id=${messageId}`);
    expect((queuedEvents[0] as any).id).toBe(variantId);
    expect((queuedEvents[0] as any).payload.messageId).toBe(messageId);
  });

  it("engages a message then marks it read", async () => {
    subject.updatePushInbox([unreadMessage]);

    const result = await subject.engageMessage(100);

    expect(result.resultCode).toBe(SwrvePushInboxResultCode.SUCCESS);
    expect((queuedEvents[0] as any).actionType).toBe("engaged");
    expect((queuedEvents[0] as any).payload.state).toBe("unread");
    expect((queuedEvents[1] as any).actionType).toBe("read");
  });

  it("deletes a message and queues the delete event", async () => {
    subject.updatePushInbox([unreadMessage]);

    const result = await subject.deleteMessage(100);

    expect(result.resultCode).toBe(SwrvePushInboxResultCode.SUCCESS);
    expect(subject.getPushInboxMessage(100)).toBeNull();
    expect((queuedEvents[0] as any).actionType).toBe("delete");
    expect((queuedEvents[0] as any).payload.state).toBe("unread");
  });
});
