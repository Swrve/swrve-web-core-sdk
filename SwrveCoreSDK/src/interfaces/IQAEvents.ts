import IDictionary from "./IDictionary";
import IReadonlyDictionary from "./IReadonlyDictionary";
import { ICampaignDownloadData } from "../Events/EventTypeInterfaces";
import IReward from "./IReward";

export interface IQANamedEvent {
  readonly log_source: "sdk";
  readonly log_details: {
    readonly type: "event";
    readonly parameters: {
      readonly name: string;
      readonly payload?: IDictionary<string | number>;
    };
    readonly seqnum: number;
    readonly client_time: number;
  };
  readonly type: "qa_log_event";
  readonly time: number;
  readonly log_type: "event";
}

export interface IQAUserUpdateEvent {
  readonly log_source: "sdk";
  readonly log_details: {
    type: "user";
    parameters: {
      attributes: IDictionary<string | number | boolean>;
    };
    seqnum: number;
    client_time: number;
  };
  readonly type: "qa_log_event";
  readonly time: number;
  readonly log_type: "event";
}

export interface IQADeviceUpdateEvent {
  readonly log_source: "sdk";
  readonly log_details: {
    type: "device_update";
    parameters: {
      attributes: IDictionary<string | number | boolean>;
    };
    seqnum: number;
    client_time: number;
  };
  readonly type: "qa_log_event";
  readonly time: number;
  readonly log_type: "event";
}

export interface IQAIAPEvent {
  readonly log_source: "sdk";
  readonly log_details: {
    readonly type: "iap";
    readonly parameters: {
      readonly product_id: string;
      readonly app_store: string;
      readonly rewards?: IReadonlyDictionary<IReward>;
      readonly cost: number;
      readonly local_currency: string;
    };
    readonly seqnum: number;
    readonly client_time: number;
  };
  readonly type: "qa_log_event";
  readonly time: number;
  readonly log_type: "event";
}

export interface IQAButtonClickedEvent {
  readonly type: "qa_log_event";
  readonly seqnum: number;
  readonly time: number;
  readonly log_type: "campaign-button-clicked";
  readonly log_source: "sdk";
  readonly log_details: {
    readonly campaign_id: number;
    readonly variant_id: number;
    readonly button_name: string;
    readonly action_type: string;
    readonly action_value: string;
  };
}

export interface IQACurrencyGivenEvent {
  log_source: "sdk";
  log_details: {
    type: "currency_given";
    parameters: {
      given_amount: number;
      given_currency: string;
    };
    seqnum: number;
    client_time: number;
  };
  type: "qa_log_event";
  time: number;
  log_type: "event";
}

export interface IQAPurchaseEvent {
  readonly log_source: "sdk";
  readonly log_details: {
    readonly type: "purchase";
    readonly parameters: {
      readonly quantity: number;
      readonly item: string;
      readonly cost: number;
      readonly currency: string;
    };
    readonly seqnum: number;
    readonly client_time: number;
  };
  readonly type: "qa_log_event";
  readonly time: number;
  readonly log_type: "event";
}

export interface IQASessionStartEvent {
  readonly log_source: "sdk";
  readonly log_details: {
    readonly type: "session_start";
    readonly parameters: {};
    readonly seqnum: number;
    readonly client_time: number;
  };
  readonly type: "qa_log_event";
  readonly time: number;
  readonly log_type: "event";
}

//--- not wrapped events ---- //

export interface ICampaignsDownloadedEvent {
  readonly log_source: string;
  readonly log_details: {
    readonly campaigns?: ReadonlyArray<ICampaignDownloadData>;
  };
  readonly seqnum: number;
  readonly type: "qa_log_event";
  readonly time: number;
  readonly log_type: "campaigns-downloaded";
}

export interface ICampaignTriggeredEvent {
  readonly type: "qa_log_event";
  readonly time: number;
  readonly seqnum: number;
  readonly log_type: "campaign-triggered";
  readonly log_source: "sdk";
  readonly log_details: {
    readonly event_name: string;
    readonly event_payload: any;
    readonly displayed: string;
    readonly reason: string;
    readonly campaigns: ReadonlyArray<{
      id: number;
      type: "iam";
      displayed: string;
      reason: string;
    }>;
  };
}
