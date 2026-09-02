import IDictionary from "./IDictionary";

export default interface IGenericCampaignEvent {
  readonly type: "generic_campaign_event";
  readonly seqnum: number;
  readonly time: number;
  readonly campaignType: string;
  readonly actionType: string;
  readonly id: string | number;
  readonly contextId?: string | number;
  readonly mediaId?: string | number;
  readonly payload?: IDictionary<string | number>;
}
