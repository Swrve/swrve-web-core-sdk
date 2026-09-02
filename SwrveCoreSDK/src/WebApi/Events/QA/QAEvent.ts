import {
  ICampaignsDownloadedEvent,
  ICampaignTriggeredEvent,
  IQAButtonClickedEvent,
  IQACurrencyGivenEvent,
  IQADeviceUpdateEvent,
  IQAGenericCampaignEvent,
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
  | IQADeviceUpdateEvent
  | IQAGenericCampaignEvent;

export default QAEvent;
