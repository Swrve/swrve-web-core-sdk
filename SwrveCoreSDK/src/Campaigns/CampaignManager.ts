import {
  ISwrveCampaign,
  ISwrveCampaignResourceResponse,
  ISwrveCampaigns,
  ISwrveCondition,
  ISwrveMessage,
  ISwrveTrigger,
  ISwrveAsset,
  ISwrveBaseMessage,
  ISwrveEmbeddedMessage,
  ISwrveMessageCenterDetails,
} from "../interfaces/ISwrveCampaign";
import { StorageManager } from "../Storage/StorageManager";
import {
  ICampaignDownloadData,
  IQACampaignTriggerEvent,
} from "../Events/EventTypeInterfaces";
import { CampaignStatus, ICampaignState } from "../interfaces/ICampaignState";
import {
  CAMPAIGN_NOT_ACTIVE,
  CAMPAIGN_NOT_DOWNLOADED,
  CAMPAIGN_THROTTLE_LAUNCH_TIME,
  CAMPAIGN_THROTTLE_MAX_IMPRESSIONS,
  CAMPAIGN_THROTTLE_RECENT,
  CAMPAIGN_ERROR_INVALID_TRIGGERS,
  GLOBAL_CAMPAIGN_THROTTLE_LAUNCH_TIME,
  GLOBAL_CAMPAIGN_THROTTLE_MAX_IMPRESSIONS,
  GLOBAL_CAMPAIGN_THROTTLE_RECENT,
  CAMPAIGN_NO_MATCH,
  SWRVE_CAMPAIGN_STATUS_UNSEEN,
  CAMPAIGN_MATCH,
  CAMPAIGN_ELIGIBLE_BUT_OTHER_CHOSEN,
  CAMPAIGN_STATE,
  CAMPAIGNS,
  SWRVE_CAMPAIGN_STATUS_SEEN,
  SWRVE_CAMPAIGN_STATUS_DELETED,
  CAMPAIGN_COULD_NOT_PERSONALIZE,
} from "../utils/SwrveConstants";
import { IPlatform } from "../interfaces/IPlatform";
import { SwrveMessageDisplayManager } from "./Messages/SwrveMessageDisplayManager";
import { AssetManager } from "./AssetManager";
import {
  OnEmbeddedMessageListener,
  OnMessageListener,
} from "../interfaces/ISwrveConfig";
import SwrveLogger from "../utils/SwrveLogger";
import { ProfileManager } from "../Profile/ProfileManager";
import {
  OnDataCaptureEvent,
  OnButtonClicked,
  OnGenericCampaignEvent,
} from "./Messages/SwrveMessageDisplayManager";
import { SwrveButton } from "./Messages/UIElements/SwrveButton";
import { SwrveImage } from "./Messages/UIElements/SwrveImage";
import { SwrveMessageCenterDetailsAsset } from "./Messages/UIElements/SwrveMessageCenterDetailsAsset";
import SwrveConfig from "../Config/SwrveConfig";
import { IDictionary } from "..";
import DateHelper from "../utils/DateHelper";
import { TextTemplating } from "../utils/TextTemplating";

export type OnAssetsLoaded = () => void;

export interface ICampaignRuleStatus {
  status: number;
  message: string;
}

export interface ICampaignTriggerStatus {
  globalStatus: ICampaignRuleStatus;
  campaignStatus?: ICampaignRuleStatus;
  campaignFailCode: number;
  campaigns: IQACampaignTriggerEvent[];
}

export interface IMessageCenterCampaignResult {
  campaign: ISwrveCampaign | null;
  reason: string;
  campaigns: IQACampaignTriggerEvent[];
}

export class CampaignManager {
  private campaigns: ReadonlyArray<ISwrveCampaign> = [];
  private campaignState: { [key: string]: ICampaignState } = {};
  private messages: ISwrveBaseMessage[] = [];
  private triggers: ISwrveTrigger[] = [];
  private platform: IPlatform;
  private storageManager: StorageManager;

  private readonly messageDisplayManager: SwrveMessageDisplayManager;
  private readonly assetManager: AssetManager;
  private onEmbeddedListener: OnEmbeddedMessageListener | null = null;

  //global rules
  private _maxMessagesPerSession: number = 99999;
  private _minDelay: number = 55;
  private _delayFirstMessage: number = 150;
  private readonly MAX_MESSAGES_PER_SESSION: number = 99999;
  private readonly MIN_DELAY: number = 55;
  private readonly DELAY_FIRST_MESSAGE: number = 150;

  //session counter
  private messagesShownCount: number = 0;
  private lastShownMessageTime: number = 0;

  constructor(
    public profileManager: ProfileManager,
    platform: IPlatform,
    storageManager: StorageManager,
    config?: SwrveConfig
  ) {
    this.storageManager = storageManager;
    this.loadStoredCampaigns(this.profileManager.currentUser.userId);
    this.messageDisplayManager = new SwrveMessageDisplayManager(
      platform,
      config
    );
    this.assetManager = new AssetManager();
    this.platform = platform;
  }

  public storeCampaigns(
    response: ISwrveCampaignResourceResponse,
    personalizationProperties: IDictionary<string>,
    onAssetsLoaded: OnAssetsLoaded
  ): void {
    if (response === undefined) {
      return;
    }

    if (response.campaigns) {
      this.handleCDN(response);
      this.campaigns = response.campaigns.campaigns || [];
      this.updateEmbeddedMessagesRawData(this.campaigns);
      this.parseGlobalRules(response.campaigns);
      this.parseMessages(this.campaigns);
      this.parseTriggers(this.campaigns);
      this.synchronizeCampaignState();
      this.handleAssets(onAssetsLoaded, personalizationProperties);
      this.storageManager.saveData(
        CAMPAIGNS + this.profileManager.currentUser.userId,
        JSON.stringify(this.campaigns)
      );
    }
  }

  public resetCampaignState(): void {
    this.campaigns = [];
    this.messages = [];
    this.triggers = [];
    this.campaignState = {};
    this.messagesShownCount = 0;
    this.lastShownMessageTime = 0;
  }

  public loadStoredCampaigns(userId: string): void {
    this.resetCampaignState();

    const storedCampaigns = this.storageManager.getData(CAMPAIGNS + userId);
    if (storedCampaigns) {
      this.campaigns = JSON.parse(storedCampaigns);
      this.updateEmbeddedMessagesRawData(this.campaigns);
    }

    const campaignState = this.storageManager.getData(CAMPAIGN_STATE + userId);
    if (campaignState) {
      this.campaignState = JSON.parse(campaignState);
    }

    if (this.campaigns) {
      this.parseMessages(this.campaigns);
      this.parseTriggers(this.campaigns);
    }
  }

  public synchronizeCampaignState(): void {
    /* only keep state for campaigns that are sent down */
    const origCampaignState = this.campaignState;
    this.campaignState = {};
    this.campaigns.forEach(({ id }) => {
      /* ensure new campaigns have a default state */
      this.campaignState[id] = origCampaignState[id] || {
        status: SWRVE_CAMPAIGN_STATUS_UNSEEN,
        impressions: 0,
        next: 0,
        lastShownTime: 0,
      };
    });

    this.storageManager.saveData(
      CAMPAIGN_STATE + this.profileManager.currentUser.userId,
      JSON.stringify(this.campaignState)
    );
  }

  public getCampaignIDs(): ICampaignDownloadData[] {
    return this.campaigns.map((campaign) => ({
      id: campaign.id,
      type: campaign.message ? "iam" : "unknown",
      variant_id: this.getCampaignVariantID(campaign),
    }));
  }

  public getCampaignVariantID(campaign: ISwrveCampaign): number {
    return campaign.message
      ? campaign.message.id
      : 0;
  }

  public getCampaignState(campaignId: string): ICampaignState {
    return this.campaignState[campaignId];
  }

  public onEmbeddedMessage(
    onEmbeddedMessageListener: OnEmbeddedMessageListener
  ): void {
    this.onEmbeddedListener = onEmbeddedMessageListener;
  }

  public onButtonClicked(callback: OnButtonClicked): void {
    this.messageDisplayManager.onButtonClicked(callback);
  }

  public onGenericCampaignEvent(callback: OnGenericCampaignEvent): void {
    this.messageDisplayManager.onGenericCampaignEvent(callback);
  }

  public onDataCaptureEvent(callback: OnDataCaptureEvent): void {
    this.messageDisplayManager.onDataCaptureEvent(callback);
  }

  public showCampaign(
    campaign: ISwrveCampaign,
    personalizationProperties?: IDictionary<string>,
    impressionCallback?: OnMessageListener
  ): boolean {
    if (campaign.message) {
      const message = campaign.message;
      message.parentCampaign = campaign.id;

      if (this.canCampaignRender(campaign, personalizationProperties)) {
        if (message.control) {
          SwrveLogger.warn(
            "This message is a control message and will not be displayed."
          );

          if (impressionCallback) {
            impressionCallback(message);
          }

          this.updateCampaignState(message);

          return false;
        }

        this.messageDisplayManager.showMessage(
          message,
          campaign,
          this.assetManager.ImagesCDN,
          personalizationProperties
        );

        if (impressionCallback) {
          impressionCallback(message);
        }

        this.updateCampaignState(message);

        return true;
      } else {
        SwrveLogger.error("cannot render campaign, not attempting to display");
        return false;
      }
    } else if (campaign.embedded_message && campaign.embedded_message.data) {
      const embeddedMessage = campaign.embedded_message;
      embeddedMessage.parentCampaign = campaign.id;

      if (this.onEmbeddedListener) {
        this.onEmbeddedListener(
          campaign.embedded_message,
          personalizationProperties,
          !!campaign.embedded_message.control
        );
        return true;
      }
      return false;
    } else {
      return false;
    }
  }

  public checkTriggers(
    triggerName: string,
    payload: object,
    impressionCallback: OnMessageListener,
    qa: boolean = false,
    personalizationProperties?: IDictionary<string>
  ): ICampaignTriggerStatus {
    const matchingMessages: ISwrveBaseMessage[] = [];
    let globalStatus = this.applyGlobalRules();
    let campaignStatus: ICampaignRuleStatus | undefined;
    const campaignStatuses: IQACampaignTriggerEvent[] = [];

    function logCampaignTriggerStatus(
      id: number,
      displayed: string,
      reason: string,
      code: number
    ): void {
      SwrveLogger.debug(
        "campaign trigger status: " + reason + " displayed " + displayed
      );
      campaignStatus = { status: code, message: reason };
      campaignStatuses.push({ id, displayed, type: "iam", reason });
    }

    if (globalStatus.status === CAMPAIGN_MATCH) {
      /* for each campaign, see if there is a matching trigger and pull out the messages if there is */
      this.campaigns.forEach((campaign) => {
        if (campaign.triggers && campaign.triggers.length > 0) {
          for (const trigger of campaign.triggers) {
            const canTrigger =
              trigger.event_name === triggerName &&
              this.canTriggerWithPayload(trigger, payload);

            if (!canTrigger && qa) {
              const reason =
                "Campaign [" +
                campaign.id +
                "], Trigger [" +
                trigger.event_name +
                "], " +
                "does not match eventName[" +
                triggerName +
                "] & payload[" +
                JSON.stringify(payload) +
                "].  Skipping this trigger.";
              logCampaignTriggerStatus(
                campaign.id,
                "false",
                reason,
                CAMPAIGN_NO_MATCH
              );
            }
            if (canTrigger) {
              if (campaign.message) {
                matchingMessages.push({
                  parentCampaign: campaign.id,
                  ...campaign.message,
                });
              } else if (campaign.embedded_message) {
                matchingMessages.push({
                  parentCampaign: campaign.id,
                  ...campaign.embedded_message,
                });
              }
              break;
            }
          }
        } else {
          if (qa) {
            const reason =
              "Campaign [" +
              campaign.id +
              "], no triggers " +
              "(could be message centre). Skipping this campaign";
            logCampaignTriggerStatus(
              campaign.id,
              "false",
              reason,
              CAMPAIGN_ERROR_INVALID_TRIGGERS
            );
          }
        }
      });

      if (matchingMessages.length > 0) {
        matchingMessages.sort((a, b) => a.priority - b.priority);

        let passedAllRules = matchingMessages.filter((message) => {
          for (const campaign of this.campaigns) {
            if (campaign.id === message.parentCampaign!) {
              const { status, message: reason } = this.applyCampaignRules(
                campaign,
                personalizationProperties
              );
              const ok = status === CAMPAIGN_MATCH;
              SwrveLogger.debug(reason);
              if (qa && !ok) {
                logCampaignTriggerStatus(campaign.id, "false", reason, status);
              }
              return ok;
            }
          }
          return false;
        });

        if (passedAllRules.length > 1) {
          const minPriority = passedAllRules.reduce(
            (min, msg) => (msg.priority < min ? msg.priority : min),
            passedAllRules[0].priority
          );

          passedAllRules = passedAllRules.filter((message) => {
            return message.priority <= minPriority;
          });
        }

        if (passedAllRules.length > 0) {
          const randomPick =
            passedAllRules.length > 1
              ? Math.floor(Math.random() * passedAllRules.length)
              : 0;
          const selectedMessage = passedAllRules[randomPick];

          if (qa) {
            const pickedCampaign = passedAllRules[randomPick];
            const logNotPicked = passedAllRules.filter(
              (message, index) => index !== randomPick
            );
            logNotPicked.forEach((message) => {
              const reason =
                "Campaign " +
                pickedCampaign.id +
                " was selected for display ahead of this campaign.";
              logCampaignTriggerStatus(
                message.parentCampaign!,
                "false",
                reason,
                CAMPAIGN_ELIGIBLE_BUT_OTHER_CHOSEN
              );
            });

            const reason =
              "Campaign [" +
              pickedCampaign.id +
              "], Trigger [" +
              triggerName +
              "], matches " +
              triggerName +
              " & payload " +
              JSON.stringify(payload) +
              ".";
            logCampaignTriggerStatus(
              pickedCampaign.parentCampaign!,
              "true",
              reason,
              CAMPAIGN_MATCH
            );
          }

          this.lastShownMessageTime = this.getNow();

          if (!this.messageDisplayManager.isIAMShowing()) {
            for (const campaign of this.campaigns) {
              if (campaign.id === selectedMessage.parentCampaign!) {
                if (campaign.message) {
                  if (selectedMessage.control) {
                    SwrveLogger.warn(
                      "This message is a control message and will not be displayed."
                    );
                    this.updateCampaignState(selectedMessage);
                    impressionCallback(selectedMessage as ISwrveMessage);
                    break;
                  }

                  this.showMessage(selectedMessage as ISwrveMessage, campaign, personalizationProperties);
                  this.updateCampaignState(selectedMessage);
                  impressionCallback(selectedMessage as ISwrveMessage);
                  break;
                }

                if (
                  campaign.embedded_message &&
                  campaign.embedded_message.data
                ) {
                  if (this.onEmbeddedListener) {
                    this.onEmbeddedListener(
                      selectedMessage as ISwrveEmbeddedMessage,
                      personalizationProperties,
                      !!selectedMessage.control
                    );
                  }

                  break;
                }
              }
            }
          }
        }
      } else if (qa) {
        globalStatus = {
          status: CAMPAIGN_NO_MATCH,
          message: "No matching campaigns.",
        };
      }
    }

    const campaignFailCode =
      globalStatus.status !== CAMPAIGN_MATCH || !campaignStatus
        ? globalStatus.status
        : campaignStatus.status;
    return {
      globalStatus,
      campaignStatus,
      campaignFailCode,
      campaigns: campaignStatuses,
    };
  }

  public showMessage(message: ISwrveMessage, campaign: ISwrveCampaign, personalizationProperties?: IDictionary<string>): void {
    this.messageDisplayManager.showMessage(
      message,
      campaign,
      this.assetManager.ImagesCDN,
      personalizationProperties
    );
  }

  public closeMessage(): void {
    this.messageDisplayManager.closeMessage();
  }

  public canTriggerWithPayload(trigger: ISwrveTrigger, payload: any): boolean {
    if (typeof trigger !== "object" || !trigger) {
      return false;
    }
    return this.hasFulfilledCondition(trigger.conditions || {}, payload || {});
  }

  public hasFulfilledCondition(
    condition: ISwrveCondition,
    payload: any
  ): boolean {
    switch (condition.op) {
      case "eq": {
        const payloadValue = this.getConditionPayloadValue(condition.key, payload);
        return payloadValue !== null &&
          payloadValue.toLowerCase() === String(condition.value).toLowerCase();
      }
      case "contains": {
        const payloadValue = this.getConditionPayloadValue(condition.key, payload);
        return payloadValue !== null &&
          payloadValue
            .toLowerCase()
            .indexOf(String(condition.value).toLowerCase()) >= 0;
      }
      case "number_gt": {
        const payloadValue = this.getConditionPayloadNumber(condition.key, payload);
        return payloadValue !== null && payloadValue > this.toInteger(condition.value);
      }
      case "number_lt": {
        const payloadValue = this.getConditionPayloadNumber(condition.key, payload);
        return payloadValue !== null && payloadValue < this.toInteger(condition.value);
      }
      case "number_eq": {
        const payloadValue = this.getConditionPayloadNumber(condition.key, payload);
        return payloadValue !== null && payloadValue === this.toInteger(condition.value);
      }
      case "number_between": {
        const payloadValue = this.getConditionPayloadNumber(condition.key, payload);
        return payloadValue !== null &&
          payloadValue > this.toInteger(condition.value.lower) &&
          payloadValue < this.toInteger(condition.value.upper);
      }
      case "number_not_between": {
        const payloadValue = this.getConditionPayloadNumber(condition.key, payload);
        return payloadValue !== null &&
          (payloadValue < this.toInteger(condition.value.lower) ||
            payloadValue > this.toInteger(condition.value.upper));
      }
      case "and":
        for (const arg of condition.args) {
          if (!this.hasFulfilledCondition(arg, payload)) {
            return false;
          }
        }
        return true;
      case "or":
        for (const arg of condition.args) {
          if (this.hasFulfilledCondition(arg, payload)) {
            return true;
          }
        }
        return false;
      default:
        if (Object.keys(condition).length === 0) {
          return true;
        }
        return false;
    }
  }

  private getConditionPayloadValue(key: string, payload: any): string | null {
    const value = payload[key];
    if (value === undefined || value === null) {
      return null;
    }

    if (typeof value === "string" || typeof value === "number") {
      return String(value);
    }

    return null;
  }

  private getConditionPayloadNumber(key: string, payload: any): number | null {
    const payloadValue = this.getConditionPayloadValue(key, payload);
    if (payloadValue === null) {
      return null;
    }

    const parsed = parseInt(payloadValue, 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  private toInteger(value: number): number {
    const parsed = parseInt(String(value), 10);
    return isNaN(parsed) ? 0 : parsed;
  }

  public handleCDN(response: ISwrveCampaignResourceResponse): void {
    this.assetManager.clearCDN();

    if (response.campaigns && response.campaigns.cdn_root) {
      this.assetManager.ImagesCDN = response.campaigns.cdn_root;
    } else if (response.campaigns && response.campaigns.cdn_paths) {
      const paths = response.campaigns.cdn_paths;
      this.assetManager.ImagesCDN = paths.message_images;
      this.assetManager.FontsCDN = paths.message_fonts;
    }
  }

  public getAssetManager(): AssetManager {
    return this.assetManager;
  }

  public getMessageCenterCampaigns(
    personalizationProperties?: IDictionary<string>
  ): ISwrveCampaign[] {
    return this.getMessageCenterCampaignsMatching(
      personalizationProperties,
      () => true
    );
  }

  public getInAppMessageCenterCampaigns(
    personalizationProperties?: IDictionary<string>
  ): ISwrveCampaign[] {
    return this.getMessageCenterCampaignsMatching(
      personalizationProperties,
      (campaign) => !!campaign.message
    );
  }

  private getMessageCenterCampaignsMatching(
    personalizationProperties: IDictionary<string> | undefined,
    predicate: (campaign: ISwrveCampaign) => boolean
  ): ISwrveCampaign[] {
    const campaigns: ISwrveCampaign[] = [];
    // Evaluate every campaign against the same timestamp so a list cannot
    // straddle the edge of a start/end date, blackout date or interval time.
    const now = this.getNow();

    this.campaigns.forEach((campaign) => {
      if (
        !predicate(campaign) ||
        !campaign.message_center ||
        (this.campaignState[campaign.id] &&
          this.campaignState[campaign.id].status ===
            SWRVE_CAMPAIGN_STATUS_DELETED) ||
        !this.isCampaignActive(campaign, now)
      ) {
        return;
      }

      const personalizedCampaign = this.personalizeMessageCenterCampaign(
        campaign,
        personalizationProperties
      );

      if (
        personalizedCampaign &&
        this.canCampaignRender(personalizedCampaign, personalizationProperties)
      ) {
        campaigns.push(personalizedCampaign);
      }
    });

    return campaigns;
  }

  public getMessageCenterCampaign(
    campaignID: number,
    personalizationProperties?: IDictionary<string>
  ): ISwrveCampaign | null {
    return this.getMessageCenterCampaignResult(
      campaignID,
      personalizationProperties
    ).campaign;
  }

  public getMessageCenterCampaignResult(
    campaignID: number,
    personalizationProperties?: IDictionary<string>
  ): IMessageCenterCampaignResult {
    const campaign = this.campaigns.find((item) => item.id === campaignID);
    const campaigns: IQACampaignTriggerEvent[] = [];

    if (!campaign) {
      const reason = "Campaign " + campaignID + " was not found.";
      return {
        campaign: null,
        reason,
        campaigns,
      };
    }

    const logFailure = (reason: string): IMessageCenterCampaignResult => {
      campaigns.push({
        id: campaign.id,
        displayed: "false",
        type: "iam",
        reason,
      });

      return {
        campaign: null,
        reason,
        campaigns,
      };
    };

    if (!campaign.message_center) {
      return logFailure(
        "Campaign " + campaign.id + " is not a message center campaign."
      );
    }

    if (
      this.campaignState[campaign.id] &&
      this.campaignState[campaign.id].status === SWRVE_CAMPAIGN_STATUS_DELETED
    ) {
      return logFailure(
        "Campaign " + campaign.id + " has been removed from message center."
      );
    }

    if (!this.isCampaignActive(campaign, this.getNow())) {
      return logFailure("Campaign " + campaign.id + " is not active.");
    }

    const personalizedCampaign = this.personalizeMessageCenterCampaign(
      campaign,
      personalizationProperties
    );

    if (!personalizedCampaign) {
      return logFailure(
        "Campaign " +
          campaign.id +
          " has unresolved message center details personalization."
      );
    }

    if (
      !this.canCampaignRender(personalizedCampaign, personalizationProperties)
    ) {
      return logFailure(
        "Campaign " +
          campaign.id +
          " has unresolved personalization properties."
      );
    }

    const returnedCampaign = this.getMessageCenterCampaigns(
      personalizationProperties
    ).find((item) => item.id === campaignID);

    if (!returnedCampaign) {
      return logFailure(
        "Campaign " + campaign.id + " was not returned by message center."
      );
    }

    return {
      campaign: returnedCampaign,
      reason: "",
      campaigns: [
        {
          id: campaign.id,
          displayed: "true",
          type: "iam",
          reason: "",
        },
      ],
    };
  }

  public getEmbeddedMessageCenterCampaigns(
    personalizationProperties?: IDictionary<string>
  ): ISwrveEmbeddedMessage[] {
    const embeddedMessages: ISwrveEmbeddedMessage[] = [];

    this.campaigns.forEach((campaign) => {
      if (
        !campaign.message_center ||
        !campaign.embedded_message ||
        this.campaignState[campaign.id].status === SWRVE_CAMPAIGN_STATUS_DELETED ||
        !this.isCampaignActive(campaign, this.getNow())
      ) {
        return;
      }

      const personalizedCampaign = this.personalizeMessageCenterCampaign(
        campaign,
        personalizationProperties
      );

      if (!personalizedCampaign || !personalizedCampaign.embedded_message) {
        return;
      }

      const embeddedOriginal = personalizedCampaign.embedded_message;

      // Clone so we don't mutate original campaign
      const embedded = {
        ...embeddedOriginal,
        data: embeddedOriginal.data,
        dataRaw: embeddedOriginal.data // Will be replaced below
      };

      try {
        let personalized: string | null;

        if (embedded.type === "json") {
          personalized = TextTemplating.applyTextTemplatingToJSON(
            embedded.dataRaw,
            personalizationProperties
          );
        } else {
          personalized = TextTemplating.applyTextTemplatingToString(
            embedded.dataRaw,
            personalizationProperties
          );
        }

        if (personalized != null) {
          embedded.data = personalized;
        }

      } catch {
        // leave as is
      }

      embeddedMessages.push(embedded);
    });

    return embeddedMessages;
  }

  public updateCampaignState(message: ISwrveBaseMessage): void {
    for (const parentCampaign of this.campaigns) {
      if (parentCampaign.id === message.parentCampaign!) {
        const campaignState = this.campaignState[parentCampaign.id];
        campaignState.impressions++;
        campaignState.status = SWRVE_CAMPAIGN_STATUS_SEEN;
        campaignState.lastShownTime = this.getNow();
        this.campaignState[parentCampaign.id] = campaignState;

        this.storageManager.saveData(
          CAMPAIGN_STATE + this.profileManager.currentUser.userId,
          JSON.stringify(this.campaignState)
        );

        this.messagesShownCount++;

        break;
      }
    }
  }

  public markCampaignAsSeen(campaign: ISwrveCampaign): void {
    this.setCampaignStatus(campaign, SWRVE_CAMPAIGN_STATUS_SEEN);
  }

  public markCampaignAsSeenById(campaignId: number): void {
    const campaign = this.campaigns.find((item) => item.id === campaignId);
    if (campaign) {
      this.setCampaignStatus(campaign, SWRVE_CAMPAIGN_STATUS_SEEN);
    }
  }

  public removeMessageCenterCampaign(campaign: ISwrveCampaign): void {
    this.setCampaignStatus(campaign, SWRVE_CAMPAIGN_STATUS_DELETED);
  }

  public removeMessageCenterCampaignById(campaignId: number): void {
    const campaign = this.campaigns.find((item) => item.id === campaignId);
    if (campaign) {
      this.setCampaignStatus(campaign, SWRVE_CAMPAIGN_STATUS_DELETED);
    }
  }

  private setCampaignStatus(
    campaign: ISwrveCampaign,
    newStatus: CampaignStatus
  ): void {
    if (campaign) {
      const campaignState = this.campaignState[campaign.id];
      campaignState.status = newStatus;
      this.campaignState[campaign.id] = campaignState;

      this.storageManager.saveData(
        CAMPAIGN_STATE + this.profileManager.currentUser.userId,
        JSON.stringify(this.campaignState)
      );
    }
  }

  private applyGlobalRules(): ICampaignRuleStatus {
    if (this.messagesShownCount >= this._maxMessagesPerSession) {
      return {
        status: GLOBAL_CAMPAIGN_THROTTLE_MAX_IMPRESSIONS,
        message: "{App Throttle limit} Too many messages shown.",
      };
    }

    const timeSinceStartup =
      this.profileManager.currentUser.sessionStart +
      this._delayFirstMessage * 1000;
    SwrveLogger.info("delay first message " + this._delayFirstMessage);
    if (timeSinceStartup > this.getNow()) {
      return {
        status: GLOBAL_CAMPAIGN_THROTTLE_LAUNCH_TIME,
        message:
          "{App Throttle limit} Too soon after launch.  Wait until " +
          timeSinceStartup,
      };
    }

    const lastDisplay = this.lastShownMessageTime + this._minDelay * 1000;
    if (this.lastShownMessageTime !== 0 && lastDisplay > this.getNow()) {
      return {
        status: GLOBAL_CAMPAIGN_THROTTLE_RECENT,
        message:
          "{App Throttle limit} Too soon after last message.  Wait until " +
          lastDisplay,
      };
    }

    return {
      status: CAMPAIGN_MATCH,
      message: "Global display rules passing.",
    };
  }

  private applyCampaignRules(
    parentCampaign: ISwrveCampaign,
    personalizationProperties?: IDictionary<string>
  ): ICampaignRuleStatus {
    const rules = parentCampaign.rules;
    const campaignState = this.campaignState[parentCampaign.id];

    const activeStatus = this.getCampaignActiveStatus(
      parentCampaign,
      this.getNow()
    );
    if (!activeStatus.active) {
      return {
        status: CAMPAIGN_NOT_ACTIVE,
        message: activeStatus.reason,
      };
    }

    const timeSinceStart =
      this.profileManager.currentUser.sessionStart +
      rules.delay_first_message * 1000;
    if (timeSinceStart > this.getNow()) {
      return {
        status: CAMPAIGN_THROTTLE_LAUNCH_TIME,
        message:
          "{Campaign throttle limit} Too soon after launch. Wait until " +
          timeSinceStart,
      };
    }

    if (
      rules.hasOwnProperty("dismiss_after_views") &&
      campaignState.impressions >= rules.dismiss_after_views
    ) {
      const message =
        "{Campaign throttle limit} Campaign " +
        parentCampaign.id +
        " has been shown " +
        parentCampaign.rules.dismiss_after_views +
        " times already";
      return {
        status: CAMPAIGN_THROTTLE_MAX_IMPRESSIONS,
        message,
      };
    }

    const lastShown =
      campaignState.lastShownTime + rules.min_delay_between_messages * 1000;
    if (campaignState.lastShownTime !== 0 && lastShown > this.getNow()) {
      const message =
        "{Campaign throttle limit} Too soon after last campaign. Wait until " +
        (lastShown + rules.min_delay_between_messages);
      return {
        status: CAMPAIGN_THROTTLE_RECENT,
        message,
      };
    }

    const assetsForTrigger = CampaignManager.getAllAssets(
      [parentCampaign],
      this.assetManager.ImagesCDN,
      personalizationProperties
    );

    if (!assetsForTrigger.every((asset) => asset.canRender())) {
      return {
        status: CAMPAIGN_COULD_NOT_PERSONALIZE,
        message: "Personalization failed for campaign " + parentCampaign,
      };
    }

    if (!this.assetManager.checkAssetsForCampaign(assetsForTrigger)) {
      return {
        status: CAMPAIGN_NOT_DOWNLOADED,
        message: "Assets not loaded for Campaign " + parentCampaign,
      };
    }

    return {
      status: CAMPAIGN_MATCH,
      message: "Campaign " + parentCampaign.id + "passes display rules",
    };
  }

  private parseGlobalRules(campaigns: ISwrveCampaigns): void {
    if (campaigns && campaigns.rules) {
      const rules = campaigns.rules;
      this._maxMessagesPerSession = rules.hasOwnProperty(
        "max_messages_per_session"
      )
        ? rules.max_messages_per_session!
        : this.MAX_MESSAGES_PER_SESSION;
      this._minDelay = rules.hasOwnProperty("min_delay_between_messages")
        ? rules.min_delay_between_messages!
        : this.MIN_DELAY;
      this._delayFirstMessage = rules.hasOwnProperty("delay_first_message")
        ? rules.delay_first_message!
        : this.DELAY_FIRST_MESSAGE;
    }

    SwrveLogger.info(
      "global Rules: max_messages_per_session:" +
        this._maxMessagesPerSession +
        " min_delay:" +
        this._minDelay +
        " delay_first_message:" +
        this._delayFirstMessage
    );
  }

  private parseMessages(campaigns: ReadonlyArray<ISwrveCampaign>): void {
    campaigns.forEach((campaign) => {
      if (campaign.message) {
        this.messages.push({ parentCampaign: campaign.id, ...campaign.message });
      }

      if (campaign.embedded_message) {
        this.messages.push({
          parentCampaign: campaign.id,
          ...campaign.embedded_message,
        });
      }
    });
  }

  private parseTriggers(campaigns: ReadonlyArray<ISwrveCampaign>): void {
    campaigns.forEach((campaign) => {
      if (campaign.triggers) {
        campaign.triggers.forEach((trigger) =>
          this.triggers.push({ parentCampaign: campaign.id, ...trigger })
        );
      }
    });
  }

  private handleAssets(
    onAssetsLoaded: OnAssetsLoaded,
    personalizationProperties?: IDictionary<string>
  ): void {
    const assets = CampaignManager.getAllAssets(
      this.campaigns,
      this.assetManager.ImagesCDN,
      personalizationProperties
    );
    this.assetManager
      .manageAssets(assets)
      .then(() => {
        SwrveLogger.info("asset download complete");
        onAssetsLoaded();
      })
      .catch((error) => {
        SwrveLogger.info("error downloading assets " + error);
      });
  }

  public static getAllAssets(
    campaigns: ReadonlyArray<ISwrveCampaign>,
    cdn: string,
    personalizationProperties?: IDictionary<string>
  ): ISwrveAsset[] {
    const assets: ISwrveAsset[] = [];
    for (const campaign of campaigns) {
      const message = campaign.message;
      if (message) {
        if (message.message_center_details) {
          CampaignManager.addMessageCenterDetailsAssets(
            assets,
            message.message_center_details,
            cdn,
            personalizationProperties
          );
        }

        const formats = (message.template && message.template.formats) || [];
        for (const format of formats) {
          const pages = format.pages && format.pages.length > 0
            ? format.pages
            : [{ images: format.images || [], buttons: format.buttons || [] }];

          for (const page of pages) {
            for (const button of page.buttons || []) {
              assets.push(
                new SwrveButton(button, cdn, personalizationProperties, format.scale, format.calibration)
              );
            }

            for (const image of page.images || []) {
              assets.push(new SwrveImage(image, cdn, personalizationProperties, format.scale, format.calibration));
            }
          }
        }
      }

      if (
        campaign.embedded_message &&
        campaign.embedded_message.message_center_details
      ) {
        CampaignManager.addMessageCenterDetailsAssets(
          assets,
          campaign.embedded_message.message_center_details,
          cdn,
          personalizationProperties
        );
      }
    }

    return assets;
  }

  private static addMessageCenterDetailsAssets(
    assets: ISwrveAsset[],
    details: ISwrveMessageCenterDetails,
    cdn: string,
    personalizationProperties?: IDictionary<string>
  ): void {
    if (details.dynamic_image_url) {
      assets.push(
        new SwrveMessageCenterDetailsAsset(
          { dynamic_image_url: details.dynamic_image_url },
          cdn,
          personalizationProperties
        )
      );
    }

    if (details.image_asset) {
      assets.push(
        new SwrveMessageCenterDetailsAsset(
          { image_asset: details.image_asset },
          cdn,
          personalizationProperties
        )
      );
    }
  }

  private personalizeMessageCenterCampaign(
    campaign: ISwrveCampaign,
    personalizationProperties?: IDictionary<string>
  ): ISwrveCampaign | null {
    if (campaign.message) {
      const message = campaign.message;
      const details = this.personalizeMessageCenterDetails(
        message.message_center_details,
        personalizationProperties
      );

      if (message.message_center_details && details === null) {
        return null;
      }

      return {
        ...campaign,
        message: {
          ...message,
          ...(details ? { message_center_details: details } : {}),
        },
        ...(details ? { message_center_details: details } : {}),
      };
    }

    if (campaign.embedded_message) {
      const details = this.personalizeMessageCenterDetails(
        campaign.embedded_message.message_center_details,
        personalizationProperties
      );

      if (campaign.embedded_message.message_center_details && details === null) {
        return null;
      }

      return {
        ...campaign,
        embedded_message: {
          ...campaign.embedded_message,
          ...(details ? { message_center_details: details } : {}),
        },
        ...(details ? { message_center_details: details } : {}),
      };
    }

    return { ...campaign };
  }

  private personalizeMessageCenterDetails(
    details?: ISwrveMessageCenterDetails,
    personalizationProperties?: IDictionary<string>
  ): ISwrveMessageCenterDetails | undefined | null {
    if (!details) {
      return undefined;
    }

    const subject = this.personalizeMessageCenterDetailsText(
      details.subject,
      personalizationProperties
    );
    const description = this.personalizeMessageCenterDetailsText(
      details.description,
      personalizationProperties
    );
    const accessibilityText = this.personalizeMessageCenterDetailsText(
      details.accessibility_text,
      personalizationProperties
    );
    const dynamicImageUrl = this.personalizeMessageCenterDetailsText(
      details.dynamic_image_url,
      personalizationProperties
    );

    if (
      subject === null ||
      description === null ||
      accessibilityText === null ||
      dynamicImageUrl === null
    ) {
      return null;
    }

    return {
      ...details,
      ...(subject !== undefined ? { subject } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(accessibilityText !== undefined
        ? { accessibility_text: accessibilityText }
        : {}),
      ...(dynamicImageUrl !== undefined
        ? { dynamic_image_url: dynamicImageUrl }
        : {}),
    };
  }

  private personalizeMessageCenterDetailsText(
    text?: string,
    personalizationProperties?: IDictionary<string>
  ): string | undefined | null {
    if (text === undefined || text === null) {
      return undefined;
    }

    try {
      const personalized = TextTemplating.applyTextTemplatingToString(
        text,
        personalizationProperties
      );
      return personalized === null ? null : personalized;
    } catch {
      SwrveLogger.debug(
        "Message Center Details has no personalization for text: " + text
      );
      return null;
    }
  }

  private canCampaignRender(
    campaign: ISwrveCampaign,
    personalizationProperties?: IDictionary<string>
  ): boolean {
    const assets = CampaignManager.getAllAssets(
      [campaign],
      this.assetManager.ImagesCDN,
      personalizationProperties
    );

    if (!assets.every((asset) => asset.canRender())) {
      return false;
    }

    if (!this.assetManager.checkAssetsForCampaign(assets)) {
      SwrveLogger.warn(
        "Campaign " + campaign.id + " hasn't downloaded all assets."
      );
      return false;
    }

    return true;
  }

  private getNow(): number {
    return DateHelper.nowInUtcTime();
  }

  private updateEmbeddedMessagesRawData(
  campaigns: ReadonlyArray<ISwrveCampaign>
  ): void {
    campaigns.forEach((campaign) => {
      if (campaign.embedded_message) {
        const msg = campaign.embedded_message;
        //update dataRaw to always be present
        (msg as ISwrveEmbeddedMessage).dataRaw = msg.data;
      }
    });
  }

  private isCampaignActive(campaign: ISwrveCampaign, now: number): boolean {
    return this.getCampaignActiveStatus(campaign, now).active;
  }

  private getCampaignActiveStatus(
    campaign: ISwrveCampaign,
    now: number
  ): { active: boolean; reason: string } {
    const timezoneType = this.getTimezoneType(campaign);
    const startDate = this.getCampaignDate(
      campaign.start_date_iso,
      campaign.start_date,
      timezoneType
    );
    const endDate = this.getCampaignDate(
      campaign.end_date_iso,
      campaign.end_date,
      timezoneType
    );

    if (startDate >= now) {
      return {
        active: false,
        reason:
          "Campaign " +
          campaign.id +
          " has not started yet. Start:" +
          this.formatCampaignDate(startDate, timezoneType) +
          " TimezoneType:" +
          timezoneType +
          " Now:" +
          this.formatCampaignDate(now, timezoneType),
      };
    }

    if (now >= endDate) {
      return {
        active: false,
        reason:
          "Campaign " +
          campaign.id +
          " has finished. End:" +
          this.formatCampaignDate(endDate, timezoneType) +
          " TimezoneType:" +
          timezoneType +
          " Now:" +
          this.formatCampaignDate(now, timezoneType),
      };
    }

    for (const blackoutDate of campaign.blackout_dates || []) {
      const fromDate = this.parseCampaignIsoDate(
        blackoutDate.from,
        timezoneType
      );
      const toDate = this.parseCampaignIsoDate(blackoutDate.to, timezoneType);

      if (fromDate === null || toDate === null) {
        SwrveLogger.error(
          "Error parsing blackout date in campaign " +
            campaign.id +
            ". Skip to next blackout date"
        );
        continue;
      }

      if (now > fromDate && now < toDate) {
        return {
          active: false,
          reason:
            "Campaign " +
            campaign.id +
            " is in blackout period. Blackout from:" +
            this.formatCampaignDate(fromDate, timezoneType) +
            " to:" +
            this.formatCampaignDate(toDate, timezoneType) +
            " TimezoneType:" +
            timezoneType +
            " Now:" +
            this.formatCampaignDate(now, timezoneType),
        };
      }
    }

    if (!this.hasActiveTimeInterval(campaign, now, timezoneType)) {
      return {
        active: false,
        reason:
          "Campaign " +
          campaign.id +
          " is outside active interval time. TimezoneType:" +
          timezoneType +
          " Now:" +
          this.formatCampaignDate(now, timezoneType),
      };
    }

    return {
      active: true,
      reason: "Campaign " + campaign.id + " is active.",
    };
  }

  private hasActiveTimeInterval(
    campaign: ISwrveCampaign,
    now: number,
    timezoneType: "global" | "local"
  ): boolean {
    const intervalTimes = campaign.interval_times || [];
    if (intervalTimes.length === 0) {
      return true;
    }

    for (const intervalTime of intervalTimes) {
      const fromSeconds = this.secondsSinceMidnightFromString(
        intervalTime.from
      );
      const toSeconds = this.secondsSinceMidnightFromString(intervalTime.to);
      const nowSeconds = this.secondsSinceMidnightFromDate(now, timezoneType);

      if (
        fromSeconds === null ||
        toSeconds === null ||
        nowSeconds === null ||
        fromSeconds > toSeconds
      ) {
        return false;
      }

      if (fromSeconds <= nowSeconds && nowSeconds <= toSeconds) {
        return true;
      }
    }

    return false;
  }

  private getTimezoneType(campaign: ISwrveCampaign): "global" | "local" {
    return campaign.timezone_type &&
      campaign.timezone_type.toLowerCase() === "local"
      ? "local"
      : "global";
  }

  private getCampaignDate(
    isoDate: string | undefined,
    fallbackDate: number,
    timezoneType: "global" | "local"
  ): number {
    if (isoDate) {
      const parsedDate = this.parseCampaignIsoDate(isoDate, timezoneType);
      if (parsedDate !== null) {
        return parsedDate;
      }
    }

    return fallbackDate;
  }

  private parseCampaignIsoDate(
    isoDate: string,
    timezoneType: "global" | "local"
  ): number | null {
    if (timezoneType === "local") {
      const match = isoDate.match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/
      );
      if (!match) {
        return null;
      }

      const localDate = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4]),
        Number(match[5]),
        Number(match[6])
      );
      if (isNaN(localDate.getTime())) {
        return null;
      }

      const secondsFromGMT = -localDate.getTimezoneOffset() * 60;
      return localDate.getTime() + secondsFromGMT * 1000;
    }

    const parsedDate = new Date(isoDate).getTime();
    return isNaN(parsedDate) ? null : parsedDate;
  }

  private secondsSinceMidnightFromString(time: string): number | null {
    const parts = time.split(":");
    if (parts.length !== 3) {
      return null;
    }

    const hours = Number(parts[0]);
    const minutes = Number(parts[1]);
    const seconds = Number(parts[2]);

    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      !Number.isInteger(seconds)
    ) {
      return null;
    }

    return hours * 3600 + minutes * 60 + seconds;
  }

  private secondsSinceMidnightFromDate(
    date: number,
    timezoneType: "global" | "local"
  ): number | null {
    const dateValue = new Date(date);
    if (isNaN(dateValue.getTime())) {
      return null;
    }

    const hours =
      timezoneType === "global"
        ? dateValue.getUTCHours()
        : dateValue.getHours();
    const minutes =
      timezoneType === "global"
        ? dateValue.getUTCMinutes()
        : dateValue.getMinutes();
    const seconds =
      timezoneType === "global"
        ? dateValue.getUTCSeconds()
        : dateValue.getSeconds();

    return hours * 3600 + minutes * 60 + seconds;
  }

  private formatCampaignDate(
    date: number,
    timezoneType: "global" | "local"
  ): string {
    const dateValue = new Date(date);
    if (timezoneType === "global") {
      return dateValue.toISOString();
    }

    return dateValue.toString();
  }
}
