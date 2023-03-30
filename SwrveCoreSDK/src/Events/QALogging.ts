import IRestClient from "../interfaces/IRestClient";
import INamedEvent from "../interfaces/INamedEvent";
import IUserUpdateEvent from "../interfaces/IUserUpdateEvent";
import IDeviceUpdateEvent from "../interfaces/IDeviceUpdateEvent";
import IPurchaseEvent from "../interfaces/IPurchaseEvent";
import IIAPEvent from "../interfaces/IIAPEvent";
import ISessionStartEvent from "../interfaces/ISessionStartEvent";
import ICurrencyGivenEvent from "../interfaces/ICurrencyGivenEvent";
import { ICampaignDownloadData, IQATriggerReport } from "./EventTypeInterfaces";
import {
  ICampaignsDownloadedEvent,
  ICampaignTriggeredEvent,
  IQAButtonClickedEvent,
  IQACurrencyGivenEvent,
  IQADeviceUpdateEvent,
  IQAIAPEvent,
  IQANamedEvent,
  IQAPurchaseEvent,
  IQASessionStartEvent,
  IQAUserUpdateEvent,
} from "../interfaces/IQAEvents";
import SwrveConfig from "../Config/SwrveConfig";
import { ProfileManager } from "../Profile/ProfileManager";
import SwrveEvent from "../WebApi/Events/SwrveEvent";
import IHttpResponse from "../interfaces/IHttpResponse";
import IEventBatch from "../interfaces/IEventBatch";
import {
  CUSTOM,
  DISMISS,
  SWRVE_EVENTS_API_VERSION,
} from "../utils/SwrveConstants";
import SwrveLogger from "../utils/SwrveLogger";
import { getStringSize } from "../utils/StringHelper";
import HttpError from "../RestClient/HttpError";
import { ISwrveMessage } from "../interfaces/ISwrveCampaign";
import { IDictionary } from "..";
import DateHelper from "../utils/DateHelper";

const LOG_SOURCE_SDK = "sdk";
const LOG_TYPE = "qa_log_event";
const LOG_TYPE_EVENT = "event";

export class QALogging {
  public qaLogFlushFrequencyMilliseconds: number = 5000;
  private readonly MAX_QUEUE_SIZE: number = 100 * 1000;
  private qaLogTimer: number = 0;
  private queue: SwrveEvent[];
  private _queueSize: number = 0;

  constructor(
    public restClient: IRestClient,
    private config: SwrveConfig,
    private profileManager: ProfileManager,
    private deviceId: string
  ) {
    this.queue = [];
  }

  public shouldBeLogging(): boolean {
    return this.profileManager.isQAUser();
  }

  public startQALogTimer() {
    SwrveLogger.debug("Started QA Logging...");
    this.qaLogTimer = setInterval(
      () => this.sendQueue(),
      this.qaLogFlushFrequencyMilliseconds
    );
  }

  public stopQALogTimer() {
    SwrveLogger.debug("Stopped QA Logging...");
    clearInterval(this.qaLogTimer);
  }

  public namedEvent(event: INamedEvent): void {
    if (this.shouldBeLogging()) {
      var logEvent = {
        log_source: LOG_SOURCE_SDK,
        log_details: {
          type: "event",
          parameters: {
            name: event.name,
            payload: event.payload,
          },
          seqnum: event.seqnum,
          client_time: event.time,
        },
        type: LOG_TYPE,
        time: event.time,
        log_type: LOG_TYPE_EVENT,
      } as IQANamedEvent;

      this.queueQAEvent(logEvent);
    }
  }

  public userUpdate(event: IUserUpdateEvent): void {
    if (this.shouldBeLogging()) {
      var logEvent = {
        log_source: LOG_SOURCE_SDK,
        log_details: {
          type: "user",
          parameters: {
            attributes: event.attributes,
          },
          seqnum: event.seqnum,
          client_time: event.time,
        },
        type: LOG_TYPE,
        time: event.time,
        log_type: LOG_TYPE_EVENT,
      } as IQAUserUpdateEvent;

      this.queueQAEvent(logEvent);
    }
  }

  public userUpdateWithDate(event: IUserUpdateEvent): void {
    if (this.shouldBeLogging()) {
      const logEvent = {
        log_source: LOG_SOURCE_SDK,
        log_details: {
          type: "user",
          parameters: {
            attributes: event.attributes,
          },
          seqnum: event.seqnum,
          client_time: event.time,
        },
        type: LOG_TYPE,
        time: event.time,
        log_type: LOG_TYPE_EVENT,
      } as IQAUserUpdateEvent;

      this.queueQAEvent(logEvent);
    }
  }

  public deviceUpdate(event: IDeviceUpdateEvent): void {
    if (this.shouldBeLogging()) {
      const logEvent = {
        log_source: LOG_SOURCE_SDK,
        log_details: {
          type: "device_update",
          parameters: {
            attributes: event.attributes,
          },
          seqnum: event.seqnum,
          client_time: event.time,
        },
        type: LOG_TYPE,
        time: event.time,
        log_type: LOG_TYPE_EVENT,
      } as IQADeviceUpdateEvent;

      this.queueQAEvent(logEvent);
    }
  }

  public purchaseEvent(event: IPurchaseEvent): void {
    if (this.shouldBeLogging()) {
      const logEvent = {
        log_source: LOG_SOURCE_SDK,
        log_details: {
          type: "purchase",
          parameters: {
            quantity: event.quantity,
            item: event.item,
            cost: event.cost,
            currency: event.currency,
          },
          seqnum: event.seqnum,
          client_time: event.time,
        },
        type: LOG_TYPE,
        time: event.time,
        log_type: LOG_TYPE_EVENT,
      } as IQAPurchaseEvent;
      this.queueQAEvent(logEvent);
    }
  }

  public inAppPurchaseEventWithoutReceipt(event: IIAPEvent): void {
    if (this.shouldBeLogging()) {
      const logEvent = {
        log_source: LOG_SOURCE_SDK,
        log_details: {
          type: "iap",
          parameters: {
            product_id: event.product_id,
            app_store: event.app_store,
            rewards: event.rewards,
            cost: event.cost,
            local_currency: event.local_currency,
          },
          seqnum: event.seqnum,
          client_time: event.time,
        },
        type: LOG_TYPE,
        time: event.time,
        log_type: LOG_TYPE_EVENT,
      } as IQAIAPEvent;
      this.queueQAEvent(logEvent);
    }
  }

  public sessionStart(event: ISessionStartEvent): void {
    if (this.shouldBeLogging()) {
      const logEvent = {
        log_source: LOG_SOURCE_SDK,
        log_details: {
          type: "session_start",
          parameters: {},
          seqnum: event.seqnum,
          client_time: event.time,
        },
        type: LOG_TYPE,
        time: event.time,
        log_type: LOG_TYPE_EVENT,
      } as IQASessionStartEvent;
      this.queueQAEvent(logEvent);
    }
  }

  public currencyGivenEvent(event: ICurrencyGivenEvent): void {
    if (this.shouldBeLogging()) {
      const logEvent = {
        log_source: LOG_SOURCE_SDK,
        log_details: {
          type: "currency_given",
          parameters: {
            given_amount: event.given_amount,
            given_currency: event.given_currency,
          },
          seqnum: event.seqnum,
          client_time: event.time,
        },
        type: LOG_TYPE,
        time: event.time,
        log_type: LOG_TYPE_EVENT,
      } as IQACurrencyGivenEvent;
      this.queueQAEvent(logEvent);
    }
  }

  public campaignTriggeredEvent(seqnum: number, event: IQATriggerReport): void {
    if (this.shouldBeLogging()) {
      const logEvent = {
        type: "qa_log_event",
        log_type: "campaign-triggered",
        seqnum,
        time: DateHelper.nowInUtcTime(),
        log_source: "sdk",
        log_details: event,
      } as ICampaignTriggeredEvent;

      this.queueQAEvent(logEvent);
    }
  }

  public campaignsDownloadedEvent(
    seqnum: number,
    campaignList: ReadonlyArray<ICampaignDownloadData>
  ): void {
    if (this.shouldBeLogging()) {
      const logEvent = {
        log_source: LOG_SOURCE_SDK,
        log_details: {
          campaigns: campaignList,
        },
        seqnum,
        type: LOG_TYPE,
        time: DateHelper.nowInUtcTime(),
        log_type: "campaigns-downloaded",
      } as ICampaignsDownloadedEvent;
      this.queueQAEvent(logEvent);
    }
  }

  public buttonClickEvent(
    campaign_id: number,
    variant_id: number,
    button_name: string,
    type: string,
    action_value: string,
    seqnum: number
  ): void {
    if (this.shouldBeLogging()) {
      let action_type;
      switch (type) {
        case DISMISS:
          action_type = "dismiss";
          break;
        case CUSTOM:
          action_type = "deeplink";
          break;
      }

      const logEvent = {
        type: "qa_log_event",
        log_type: "campaign-button-clicked",
        seqnum,
        time: DateHelper.nowInUtcTime(),
        log_source: "sdk",
        log_details: {
          campaign_id,
          variant_id,
          button_name,
          action_type,
          action_value,
        },
      } as IQAButtonClickedEvent;

      this.queueQAEvent(logEvent);
    }
  }

  public getQueue(): SwrveEvent[] {
    return [...this.queue];
  }

  public async sendQueue(): Promise<boolean> {
    let eventsToSend = this.getQueue();

    if (eventsToSend.length > 0) {
      this.clearQueue();
      SwrveLogger.debug("Sending QA Log Queue", eventsToSend);

      return this.postQueuedQAEvents(eventsToSend)
        .then(() => {
          return true;
        })
        .catch((error) => {
          SwrveLogger.error(
            `Error sending events :: ${error.name} - ${error.message}`
          );
          if (error instanceof HttpError === false || error.code === 500) {
            /* Rollback and add everything back to queue on 500 or Unknown error */
            this.queue = [...this.queue, ...eventsToSend];
          }
          return false;
        });
    }
    return Promise.resolve(false);
  }

  public get queueSize(): number {
    return this._queueSize;
  }

  public clearQueue(): void {
    this.queue = [];
    this._queueSize = 0;
  }

  /** ----- PRIVATE METHODS ----- **/

  private queueQAEvent(evt: SwrveEvent): void {
    this.queue.push(evt);
    this.calculateQueueSize(evt);
  }

  private calculateQueueSize(evt: SwrveEvent): void {
    const evtString = JSON.stringify(evt);
    this._queueSize += getStringSize(evtString);
  }

  private async postQueuedQAEvents(
    events: ReadonlyArray<SwrveEvent>
  ): Promise<IHttpResponse<any>> {
    const path = `${this.config.EventsUrl}/1/batch`;

    const body: IEventBatch = {
      user: this.profileManager.currentUser.userId,
      app_version: this.config.AppVersion,
      session_token: this.profileManager.getSessionToken(),
      version: SWRVE_EVENTS_API_VERSION,
      unique_device_id: this.deviceId,
      data: events,
    };

    return await this.restClient.post<IEventBatch, any>(path, body);
  }
}
