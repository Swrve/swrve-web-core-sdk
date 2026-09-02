import IDictionary from "./IDictionary";

export type SwrvePushInboxId = string | number;

export enum SwrvePushInboxMessageState {
  UNREAD = "UNREAD",
  READ = "READ",
  DELETED = "DELETED",
}

export enum SwrvePushInboxResultCode {
  SUCCESS = "SUCCESS",
  ERROR_UNKNOWN = "ERROR_UNKNOWN",
  ERROR = "ERROR",
}

export interface ISwrvePushInboxMessageRaw {
  message_id: SwrvePushInboxId;
  variant_id: SwrvePushInboxId;
  state: "U" | "R" | string;
  customer_json?: IDictionary<any>;
  sent_date: number;
  end_date: number;
  mg_tracking_data?: string;
}

export interface ISwrvePushInboxMessage {
  messageId: string;
  variantId: string;
  state: SwrvePushInboxMessageState;
  customerJson?: IDictionary<any>;
  sentDate: number;
  endDate: number;
  trackingData: string;
}

export interface ISwrvePushInboxResult {
  resultCode: SwrvePushInboxResultCode;
  errorMessage: string;
  httpResponseCode: number;
}

export type OnPushInboxOperationComplete = (
  messageId: SwrvePushInboxId,
  result: ISwrvePushInboxResult
) => void;

export type OnPushInboxUpdated = () => void;
