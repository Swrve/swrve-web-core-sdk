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
} from "../../../interfaces/IQAEvents";

type QAEvent =
  | ICampaignsDownloadedEvent
  | ICampaignTriggeredEvent
  | IQANamedEvent
  | IQAUserUpdateEvent
  | IQAButtonClickedEvent
  | IQASessionStartEvent
  | IQAPurchaseEvent
  | IQAIAPEvent
  | IQACurrencyGivenEvent
  | IQADeviceUpdateEvent;

export default QAEvent;
