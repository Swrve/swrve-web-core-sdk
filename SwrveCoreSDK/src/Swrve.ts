import { EventFactory } from "./Events/EventFactory";
import { ProfileManager } from "./Profile/ProfileManager";
import { CampaignManager } from "./Campaigns/CampaignManager";
import {
  ISwrveBaseMessage,
  ISwrveButton,
  ISwrveCampaign,
  ISwrveCampaignResourceResponse,
  ISwrveButtonEvent,
  ISwrveButtonPayloadItem,
  ISwrveEmbeddedMessage,
  IUserResource,
} from "./interfaces/ISwrveCampaign";
import {
  IPlatform,
  NETWORK_CONNECTED,
  NetworkListener,
} from "./interfaces/IPlatform";
import { ResourceManagerInternal } from "./Resources/ResourceManagerInternal";
import { ResourceManager } from "./Resources/ResourceManager";
import {
  GetResourcesCallback,
  GetUserResourcesDiffCallback,
  OnCampaignLoadedCallback,
  OnIdentifyErrorCallback,
  OnIdentifySuccessCallback,
  OnResourcesLoadedCallback,
  OnSwrveCoreReadyCallback,
} from "./SwrveCoreSDK";
import * as SwrveConstants from "./utils/SwrveConstants";
import { StorageManager } from "./Storage/StorageManager";
import { IUserInfo } from "./interfaces/IUser";
import IIdentityParams from "./interfaces/IIdentityParams";
import IdentityResponse from "./interfaces/IIdentityResponse";
import SwrveLogger from "./utils/SwrveLogger";
import { EventManager } from "./Events/EventManager";
import { RealTimeUserPropertiesManager } from "./UserProperties/RealTimeUserPropertiesManager";
import { SwrveRestClient } from "./RestClient/SwrveRestClient";
import { ISwrveConfig } from "./interfaces/ISwrveConfig";
import {
  ISwrveMessageButtonDetails,
  ISwrveMessageDetails,
  OnSwrveInAppMessageListener,
  SwrveMessageAction,
} from "./interfaces/ISwrveMessageListener";
import { queryDeviceProperties } from "./utils/DeviceProperties";
import IResourceDiff from "./interfaces/IResourceDiff";
import IDictionary from "./interfaces/IDictionary";
import IReadonlyDictionary from "./interfaces/IReadonlyDictionary";
import IReward from "./interfaces/IReward";
import SwrveEvent from "./WebApi/Events/SwrveEvent";
import { getInstallDateFormat } from "./utils/TimeHelper";
import {
  SWRVE_EMBEDDED_CAMPAIGN_VERSION,
  SWRVE_IN_APP_CAMPAIGN_VERSION,
  SWRVE_PUSH_INBOX_VERSION,
  SWRVE_USER_CONTENT_API_VERSION,
} from "./utils/SwrveConstants";
import { IQueryParams } from "./interfaces/IQueryParams";
import IRestClient from "./interfaces/IRestClient";
import IPushEvent from "./interfaces/IPushEvent";
import SwrveConfig from "./Config/SwrveConfig";
import { generateUuid } from "./utils/uuid";
import { QALogging } from "./Events/QALogging";
import IHttpResponse from "./interfaces/IHttpResponse";
import { ISwrveMessage } from "./interfaces/ISwrveCampaign";
import { combineDictionaries } from "./utils/DictionaryHelper";
import { TextTemplating } from "./utils/TextTemplating";
import DateHelper from "./utils/DateHelper";
import IGenericCampaignEvent from "./interfaces/IGenericCampaignEvent";
import { ISwrveDataCaptureEvent, IButtonClickContext } from "./Campaigns/Messages/SwrveMessageDisplayManager";
import { PushInboxManager } from "./PushInbox/PushInboxManager";
import {
  ISwrvePushInboxMessage,
  ISwrvePushInboxResult,
  OnPushInboxOperationComplete,
  OnPushInboxUpdated,
  SwrvePushInboxId,
} from "./interfaces/IPushInbox";

export class Swrve {
  public readonly profileManager: ProfileManager;

  private readonly config: SwrveConfig;
  private readonly evtManager: EventManager;
  private readonly eventFactory: EventFactory;
  private readonly restClient: IRestClient;
  private readonly campaignManager: CampaignManager;
  private readonly resourceManager: ResourceManagerInternal;
  private readonly platform: IPlatform;
  private readonly storageManager: StorageManager;
  private readonly realTimeUserPropertiesManager: RealTimeUserPropertiesManager;
  private readonly qaLogging: QALogging;
  private readonly pushInboxManager: PushInboxManager;

  private onResourcesLoadedCallback: OnResourcesLoadedCallback | null = null;
  private onCampaignLoadedCallback: OnCampaignLoadedCallback | null = null;
  private inAppMessageListener: OnSwrveInAppMessageListener | null = null;
  private onPushInboxUpdatedCallback: OnPushInboxUpdated | null = null;
  private onSwrveCoreReadyCallback?: OnSwrveCoreReadyCallback;

  private eventLoopTimer: number = 0;
  private flushFrequency: number = 0;
  private _shutdown: boolean = false;
  private autoShowEnabled: boolean = true;
  private pauseSDK: boolean = false;
  private identifiedOnlyTracking: boolean = false;
  private installDate: string = "";
  private identifyNetworkMonitorHandle?: NetworkListener;
  private campaignNetworkMonitorHandle?: NetworkListener;
  private identifiedOnAnotherDevice: boolean = false;
  private webPushApiKey: string = "";

  public constructor(
    config: Readonly<ISwrveConfig>,
    dependencies: IDependencies
  ) {
    if (dependencies.platform == undefined) {
      throw new Error(SwrveConstants.REQUIRED_DEPENDENCY_PLATFORM);
    }

    this.platform = dependencies.platform;
    this.storageManager = new StorageManager(this.platform);

    this.loadInstallDate();

    var lastUserId = this.storageManager.getData(
      SwrveConstants.SWRVE_USER_ID_NO_PREFIX
    );
    SwrveLogger.debug(`last user ID: ${lastUserId}`);

    if (lastUserId === null) {
      lastUserId = generateUuid().toString();
    }

    this.config = new SwrveConfig(config);
    this.resourceManager = new ResourceManagerInternal(this.storageManager);
    this.restClient = dependencies.restClient || new SwrveRestClient();

    this.profileManager =
      dependencies.profileManager ||
      new ProfileManager(
        lastUserId,
        this.config.AppID,
        this.config.ApiKey,
        this.config.NewSessionInterval,
        this.storageManager
      );

    this.campaignManager =
      dependencies.campaignManager ||
      new CampaignManager(
        this.profileManager,
        this.platform,
        this.storageManager,
        this.config
      );

    this.realTimeUserPropertiesManager = new RealTimeUserPropertiesManager(
      this.profileManager,
      this.storageManager
    );

    if (this.platform.name().variation == SwrveConstants.WEB_PLATFORM) {
      this.identifiedOnlyTracking = true;
      this.pauseSDK = true;
      SwrveLogger.debug("Identified-only tracking: enabled");
    }

    if (
      this.config.EmbeddedMessageConfig &&
      this.config.EmbeddedMessageConfig.embeddedCallback
    ) {
      if (
        typeof this.config.EmbeddedMessageConfig.embeddedCallback !== "function"
      ) {
        SwrveLogger.error(
          SwrveConstants.INVALID_FUNCTION.replace("$", "onEmbeddedMessage")
        );
      }

      this.campaignManager.onEmbeddedMessage(
        this.config.EmbeddedMessageConfig.embeddedCallback
      );
    }

    this.setupInAppConfiguration(config);

    this.campaignManager.onButtonClicked((button, message, context) =>
      this.handleButtonClicked(button, message, context)
    );
    this.campaignManager.onGenericCampaignEvent((event) =>
      this.handleGenericCampaignEvent(event)
    );
    this.campaignManager.onDataCaptureEvent((event) =>
      this.handleDataCaptureEvent(event)
    );

    this.evtManager =
      dependencies.eventManager ||
      new EventManager(
        this.restClient,
        this.storageManager,
        this.config,
        this.profileManager,
        this.platform.deviceID
      );

    this.eventFactory = new EventFactory();

    this.pushInboxManager = new PushInboxManager(
      this.storageManager,
      this.restClient,
      this.eventFactory,
      () => this.profileManager.currentUser.userId,
      () => this.config.ApiKey,
      () => this.config.ContentUrl,
      () => this.profileManager.getNextSequenceNumber(),
      (event) => this.queueEvent(event),
      () => this.sendQueuedEvents(),
      (event) => this.qaLogging.genericCampaignEvent(event)
    );

    /* establish QALogging */
    this.qaLogging = new QALogging(
      this.restClient,
      this.config,
      this.profileManager,
      this.platform.deviceID
    );
  }

  public init(callback?: OnSwrveCoreReadyCallback): void {
    /* Save the last user so we don't make a new one every attempt */
    this.profileManager.storeUserId(this.profileManager.userId);
    this.onSwrveCoreReadyCallback = callback;

    if (this.identifiedOnlyTracking) {
      this.nonAnonTrackingInit();
    } else {
      this.anonPermittedTrackingInit();
    }
  }

  private setupInAppConfiguration(config: Readonly<ISwrveConfig>) {
    if (!config.inAppMessageConfig) {
      return;
    }

    if (
      config.inAppMessageConfig.messageListener &&
      typeof config.inAppMessageConfig.messageListener === "function"
    ) {
      this.inAppMessageListener = config.inAppMessageConfig.messageListener;
    }
  }

  private nonAnonTrackingInit() {
    /* forces identify calls to be the only way to start */
    const externalId = this.config.StartupExternalUserId;
    const previousSwrveID = this.profileManager.currentUser.userId;
    this.identify(
      externalId,
      (status: string, swrveUserId: string) => {
        SwrveLogger.debug(
          "identified successfully: " + status + " userId: " + swrveUserId
        );

        this.anonPermittedTrackingInit();
      },
      (error: string) => {
        SwrveLogger.error(error);
      }
    );
  }

  private anonPermittedTrackingInit() {
    /* Add lifecycle listeners */
    window.onbeforeunload = (): void => {
      this.pageStateHandler();
      this.shutdown();
    };
    window.onblur = (): void => {
      this.pageStateHandler();
    };

    this.platform
      .init(["language", "countryCode", "timezone", "firmware"])
      .then(() => {
        if (!this._shutdown) {
          this.queueDeviceProperties();
        }
      });

    this.initSDK();
  }

  public getConfig(): Readonly<ISwrveConfig> {
    return this.config.getReadonlyVersion();
  }

  public getUserId(): string {
    return this.profileManager.currentUser.userId;
  }

  public getExternalUserId(): string | null {
    let externalUserId = this.profileManager.currentUser.externalUserId;
    if (externalUserId != null) {
      return externalUserId;
    } else {
      return null;
    }
  }

  public getPlatform(): IPlatform {
    return this.platform;
  }

  public getSDKVersion(): string {
    return this.platform.sdkVersion;
  }

  public getWebPushApiKey(): string {
    return this.webPushApiKey;
  }

  public getQALogging(): QALogging {
    return this.qaLogging;
  }

  public getUserInfo(): IUserInfo {
    const { userId, externalUserId, firstUse, sessionStart, isQAUser } =
      this.profileManager.currentUser;
    return { userId, externalUserId, firstUse, sessionStart, isQAUser };
  }

  public getMessageCenterCampaigns(
    personalizationProperties?: IDictionary<string>
  ): ISwrveCampaign[] {
    const properties = this.retrievePersonalizationProperties(undefined, personalizationProperties);
    return this.campaignManager.getMessageCenterCampaigns(properties);
  }

  public getInAppMessageCenterCampaigns(
    personalizationProperties?: IDictionary<string>
  ): ISwrveCampaign[] {
    const properties = this.retrievePersonalizationProperties(
      undefined,
      personalizationProperties
    );
    return this.campaignManager.getInAppMessageCenterCampaigns(properties);
  }

  public getMessageCenterCampaign(
    campaignID: number,
    personalizationProperties?: IDictionary<string>
  ): ISwrveCampaign | null {
    const properties = this.retrievePersonalizationProperties(
      undefined,
      personalizationProperties
    );
    const result = this.campaignManager.getMessageCenterCampaignResult(
      campaignID,
      properties
    );

    if (!result.campaign) {
      const event = this.eventFactory.getCampaignTriggeredEvent(
        "Swrve.Messages.MessageCenterCampaign",
        { campaign_id: campaignID },
        result.reason,
        "false",
        result.campaigns
      );
      const nextQASeqNum = this.profileManager.getNextSequenceNumber();
      this.qaLogging.campaignTriggeredEvent(nextQASeqNum, event);
    }

    return result.campaign;
  }

  //************************************ EVENTS ********************************************************************/

  public event(keyName: string, payload: IDictionary<string | number>): void {
    if (this.pauseSDK) return;

    this.validateEventName(keyName);

    const evt = this.eventFactory.getNamedEvent(
      keyName,
      payload,
      this.profileManager.getNextSequenceNumber(),
      DateHelper.nowInUtcTime()
    );

    this.queueEvent(evt);

    this.qaLogging.namedEvent(evt);
    this.checkTriggers(keyName, payload);
  }

  public userUpdateWithDate(keyName: string, date: Date): void {
    if (this.pauseSDK) return;

    this.validateEventName(keyName);

    const evt = this.eventFactory.getUserUpdateWithDate(
      keyName,
      date,
      this.profileManager.getNextSequenceNumber(),
      DateHelper.nowInUtcTime()
    );
    this.queueEvent(evt);

    this.qaLogging.userUpdateWithDate(evt);
  }

  public deviceUpdate(attributes: IReadonlyDictionary<string | number>): void {
    if (this.pauseSDK) return;

    const evt = this.eventFactory.getDeviceUpdate(
      attributes,
      this.profileManager.getNextSequenceNumber(),
      DateHelper.nowInUtcTime()
    );

    this.queueEvent(evt);

    this.qaLogging.deviceUpdate(evt);
  }

  public userUpdate(
    attributes: IReadonlyDictionary<string | number | boolean>
  ): void {
    if (this.pauseSDK) return;

    const evt = this.eventFactory.getUserUpdate(
      attributes,
      this.profileManager.getNextSequenceNumber(),
      DateHelper.nowInUtcTime()
    );

    this.queueEvent(evt);

    this.qaLogging.userUpdate(evt);
  }

  public purchase(
    keyName: string,
    currency: string,
    cost: number,
    quantity: number
  ): void {
    if (this.pauseSDK) return;

    this.validateEventName(keyName);

    const evt = this.eventFactory.getPurchaseEvent(
      keyName,
      currency,
      cost,
      quantity,
      this.profileManager.getNextSequenceNumber(),
      DateHelper.nowInUtcTime()
    );

    this.queueEvent(evt);
    this.sendQueuedEvents();

    this.qaLogging.purchaseEvent(evt);
  }

  public iap(
    quantity: number,
    productId: string,
    productPrice: number,
    currency: string,
    rewards?: IReadonlyDictionary<IReward>
  ): void {
    if (this.pauseSDK) return;

    const evt = this.eventFactory.getInAppPurchaseEventWithoutReceipt(
      quantity,
      productId,
      productPrice,
      currency,
      this.profileManager.getNextSequenceNumber(),
      DateHelper.nowInUtcTime(),
      rewards
    );

    this.queueEvent(evt);

    this.sendQueuedEvents();

    this.qaLogging.inAppPurchaseEventWithoutReceipt(evt);
  }

  public currencyGiven(currencyGiven: string, amount: number): void {
    if (this.pauseSDK) return;

    const evt = this.eventFactory.getCurrencyGivenEvent(
      currencyGiven,
      amount,
      this.profileManager.getNextSequenceNumber(),
      DateHelper.nowInUtcTime()
    );

    this.queueEvent(evt);

    this.qaLogging.currencyGivenEvent(evt);
  }

  public sendQueuedEvents(
    userId: string = this.profileManager.currentUser.userId,
    forceUpdate: boolean = false
  ): void {
    SwrveLogger.info("sending queued events");
    if (this.pauseSDK) {
      return;
    }
    this.evtManager.sendQueue(userId).then(() => {
      if (forceUpdate) {
        this.updateCampaignsAndResources(forceUpdate);
      }
    });
  }

  public getQueuedEvents(): SwrveEvent[] {
    return this.evtManager.getAllQueuedEvents(this.profileManager.userId);
  }

  public enqueuePushEvents(events: IPushEvent[]): void {
    events.forEach((evt) => {
      // Push "delivered" is sent as a generic_campaign_event (campaignType
      // "push", actionType "delivered") to match iOS/Android. Other push
      // events (e.g. engaged) remain named events, also matching native.
      if (evt.event_type === SwrveConstants.SWRVE_PUSH_RECEIVED_EVENT_TYPE) {
        const delivered = this.eventFactory.getGenericCampaignEvent(
          this.profileManager.getNextSequenceNumber(),
          "push",
          "delivered",
          this.resolvePushId(evt.event),
          undefined,
          evt.payload,
          undefined,
          evt.timestamp
        );

        this.queueEvent(delivered);
        this.qaLogging.genericCampaignEvent(delivered);
        return;
      }

      const wrapped = this.eventFactory.getNamedEvent(
        evt.event,
        evt.payload,
        this.profileManager.getNextSequenceNumber(),
        evt.timestamp
      );

      this.queueEvent(wrapped);
      this.qaLogging.namedEvent(wrapped);
    });
  }

  private resolvePushId(eventName: string): string {
    const match = /Push-(.+)\.delivered$/.exec(eventName);
    return match ? match[1] : eventName;
  }

  //******************************************** Embedded Campaigns ********************************************/

  public embeddedMessageWasShownToUser(message: ISwrveEmbeddedMessage): void {
    this.campaignManager.updateCampaignState(message);
    this.queueMessageImpressionEvent(message, { embedded: "true" });
  }

  public embeddedControlMessageImpressionEvent(
    message: ISwrveEmbeddedMessage
  ): void {
    this.queueMessageImpressionEvent(message, { embedded: "true" });
  }

  public embeddedMessageButtonWasPressed(
    message: ISwrveEmbeddedMessage,
    buttonName: string
  ): void {
    const nextSeqNum = this.profileManager.getNextSequenceNumber();
    const evt = this.eventFactory.getButtonClickEvent(
      nextSeqNum,
      message,
      buttonName,
      "true"
    );
    this.queueEvent(evt);
    this.qaLogging.namedEvent(evt);
  }

  public getPersonalizedEmbeddedMessageData(
    message: ISwrveEmbeddedMessage,
    personalizationProperties: IDictionary<string>
  ): string | null {
    if (message != null) {
      try {
        if (message.type == "json") {
          return TextTemplating.applyTextTemplatingToJSON(
            message.data,
            personalizationProperties
          );
        } else {
          return TextTemplating.applyTextTemplatingToString(
            message.data,
            personalizationProperties
          );
        }
      } catch (e) {
        SwrveLogger.error(
          "Campaign id:%s Could not resolve, error with personalization",
          e
        );
      }
    }
    return null;
  }

  public getPersonalizedText(
    text: string,
    personalizationProperties: IDictionary<string>
  ): string | null {
    if (text != null) {
      try {
        return TextTemplating.applyTextTemplatingToString(
          text,
          personalizationProperties
        );
      } catch (e) {
        SwrveLogger.error("could not resolve, error with personalization", e);
      }
    }

    return null;
  }

  public getEmbeddedMessageCenterCampaigns(
    personalizationProperties?: IDictionary<string>
  ): ISwrveEmbeddedMessage[] {
    const properties = this.retrievePersonalizationProperties(undefined, personalizationProperties);
    return this.campaignManager.getEmbeddedMessageCenterCampaigns(properties);
  }

  public pushInboxMessages(): ISwrvePushInboxMessage[] {
    return this.pushInboxManager.filteredMessages();
  }

  public readPushInboxMessage(
    messageId: SwrvePushInboxId,
    listener?: OnPushInboxOperationComplete
  ): Promise<ISwrvePushInboxResult> {
    return this.pushInboxManager.readMessage(messageId, listener);
  }

  public deletePushInboxMessage(
    messageId: SwrvePushInboxId,
    listener?: OnPushInboxOperationComplete
  ): Promise<ISwrvePushInboxResult> {
    return this.pushInboxManager.deleteMessage(messageId, listener);
  }

  public engagePushInboxMessage(
    messageId: SwrvePushInboxId,
    listener?: OnPushInboxOperationComplete
  ): Promise<ISwrvePushInboxResult> {
    return this.pushInboxManager.engageMessage(messageId, listener);
  }

  public pushInboxUpdateListener(listener: OnPushInboxUpdated): void {
    this.onPushInboxUpdatedCallback = listener;
  }

  //******************************************** Lifecycle *********************************************************/

  public stop(): void {
    this.pauseSDK = true;
    clearInterval(this.eventLoopTimer);
    this.eventLoopTimer = 0;
  }

  //******************************************** OTHER *********************************************************/

  public async updateCampaignsAndResources(
    forceUpdate: boolean = false
  ): Promise<void> {
    return this.getCampaignsAndResources()
      .then((response) => {
        this.handleCampaignResponse(response);

        if (this.isCampaignCallPending()) {
          this.cleanUpCampaignCallPending();
        }
      })
      .catch((error) => {
        SwrveLogger.warn("get campaigns failed ", error);

        if (!this.isCampaignCallPending()) {
          this.campaignNetworkMonitorHandle = this.platform.monitorNetwork(
            (state) => {
              if (state === NETWORK_CONNECTED) {
                SwrveLogger.info(
                  "network reconnected retrying get campaigns"
                );
                this.platform.stopMonitoringNetwork(
                  this.campaignNetworkMonitorHandle!
                );
                this.updateCampaignsAndResources();
              }
            }
          );
        }

        this.storageManager.saveData(
          SwrveConstants.CAMPAIGN_CALL_PENDING,
          this.profileManager.currentUser.userId
        );

        if (forceUpdate) {
          const userId = this.profileManager.currentUser.userId;

          this.realTimeUserPropertiesManager.loadStoredUserProperties(userId);
          this.campaignManager.loadStoredCampaigns(userId);
          this.resourceManager.getResources(userId).then((resources) => {
            if (this.onResourcesLoadedCallback != null) {
              this.onResourcesLoadedCallback(resources || []);
            }
          });
          this.autoShowMessages();
        }
      });
  }

  public async refreshCampaignsAndResources(): Promise<void> {
    this.profileManager.clearEtagHeader();
    return this.updateCampaignsAndResources(true);
  }

  public getRealTimeUserProperties(): IDictionary<string> {
    return this.realTimeUserPropertiesManager.UserProperties;
  }

  public saveToStorage(): void {
    this.evtManager.saveEventsToStorage(this.profileManager.currentUser.userId);
  }

  public identify(
    externalUserID: string | null,
    onIdentifySuccess: OnIdentifySuccessCallback,
    onIdentifyError: OnIdentifyErrorCallback
  ): void {
    if (!this.identifiedOnlyTracking) {
      this.sendQueuedEvents();
    }

    this.pauseSDK = true;
    const previousSwrveId: string = this.profileManager.currentUser.userId;

    if (externalUserID === "" || externalUserID == null) {
      if (!this.identifiedOnlyTracking) {
        this.createAnonymousUser();
        this.startNewSession();
        return;
      } else {
        let errorMsg =
          "ExternalUserId must be set in config for non-anonymous tracking";
        onIdentifyError(errorMsg);
        throw new Error(errorMsg);
      }
    }

    const cachedSwrveUserId =
      this.profileManager.getSwrveIdByExternalUserID(externalUserID);
    if (cachedSwrveUserId) {
      this.pauseSDK = false;
      if (cachedSwrveUserId !== this.profileManager.currentUser.userId) {
        this.switchUser(cachedSwrveUserId, externalUserID);
      } else {
        this.profileManager.setExternalUserId(externalUserID);
      }

      onIdentifySuccess(
        "User Id already cached and loaded.",
        cachedSwrveUserId
      );
    } else {
      if (
        this.profileManager.isUserIdVerified(
          this.profileManager.currentUser.userId
        ) ||
        !this.profileManager.currentUser.isAnonymous
      ) {
        /* generate a new profile to accept the profile */
        this.createAnonymousUser();
      }

      const swrveId = this.profileManager.currentUser.userId;
      this.makeIdentityCall(
        externalUserID,
        previousSwrveId,
        swrveId,
        onIdentifySuccess,
        onIdentifyError
      );
    }
  }

  //******************************************** CALLBACKS *********************************************************/

  public queueMessageImpressionEvent(
    message: ISwrveBaseMessage,
    payload?: IDictionary<string | number>
  ): void {
    const nextSeqNum = this.profileManager.getNextSequenceNumber();
    if (!payload) {
      payload = { embedded: "false" };
    }

    payload = {
      ...payload,
      ...this.iamCommonPayload(),
    };

    const evt = this.eventFactory.getImpressionEvent(
      message,
      nextSeqNum,
      payload
    );

    this.queueEvent(evt);
    this.qaLogging.namedEvent(evt);

    /* Embedded campaigns have their own embeddedCallback and must not fire the
     * in-app message listener. */
    if (payload.embedded !== "true") {
      this.notifyInAppMessageListener(
        SwrveMessageAction.Impression,
        this.getMessageDetails(message)
      );
    }
  }

  private getMessageDetails(message: ISwrveBaseMessage): ISwrveMessageDetails {
    return {
      campaignId: message.parentCampaign,
      variantId: message.id,
      messageName: message.name,
      campaignSubject: message.message_center_details
        ? message.message_center_details.subject
        : undefined,
    };
  }

  private getButtonDetails(
    button: ISwrveButton,
    resolvedAction?: string,
    resolvedText?: string
  ): ISwrveMessageButtonDetails {
    const authoredText = button.text ? String(button.text.value) : undefined;

    return {
      buttonName: button.name,
      buttonText: resolvedText !== undefined ? resolvedText : authoredText,
      actionType: String(button.type.value),
      actionString:
        resolvedAction !== undefined
          ? resolvedAction
          : String(button.action.value),
    };
  }

  /**
   * Resolves personalization in an authored button string. Campaigns whose
   * button text or action cannot be resolved are filtered out before display
   * (SwrveButton.canRender), so this falls back to the authored value rather
   * than blocking the click.
   */
  private resolvePersonalization(
    text: string,
    personalizationProperties?: IDictionary<string>
  ): string {
    if (!text) {
      return text;
    }

    try {
      const resolved = TextTemplating.applyTextTemplatingToString(
        text,
        personalizationProperties
      );
      if (resolved !== null) {
        return resolved;
      }
    } catch (e) {
      SwrveLogger.warn("Could not resolve personalization for: " + text);
    }

    return text;
  }

  private notifyInAppMessageListener(
    action: SwrveMessageAction,
    messageDetails: ISwrveMessageDetails,
    selectedButton?: ISwrveMessageButtonDetails
  ): void {
    if (!this.inAppMessageListener) {
      return;
    }

    try {
      this.inAppMessageListener(action, messageDetails, selectedButton);
    } catch (error) {
      SwrveLogger.error("Error in messageListener callback", error);
    }
  }

  /**
   * Common payload fields stamped on every IAM analytics event
   * (impression, click, dismiss, navigation, page_view, video_*),
   * mirroring iOS `iamCommonEventPayload` and Android's per-event
   * platform/deviceType additions.
   */
  private iamCommonPayload(): { platform: string; deviceType: string } {
    return {
      platform: this.platform.name().variation,
      deviceType: this.platform.deviceType,
    };
  }

  public onResourcesLoaded(callback: OnResourcesLoadedCallback): void {
    if (typeof callback !== "function") {
      SwrveLogger.error(
        SwrveConstants.INVALID_FUNCTION.replace("$", "onResourcesLoaded")
      );
      return;
    }

    this.onResourcesLoadedCallback = callback;
  }

  public onCampaignLoaded(callback: OnCampaignLoadedCallback): void {
    if (typeof callback !== "function") {
      SwrveLogger.error(
        SwrveConstants.INVALID_FUNCTION.replace("$", "onCampaignLoaded")
      );
      return;
    }

    this.onCampaignLoadedCallback = callback;
  }

  //************************************* RESOURCES *****************************************************************/

  public getResources(callback: GetResourcesCallback): void {
    if (typeof callback !== "function") {
      SwrveLogger.error(
        SwrveConstants.INVALID_FUNCTION.replace("$", "getResources")
      );
      return;
    }

    this.resourceManager
      .getResources(this.profileManager.currentUser.userId)
      .then((resources) => {
        if (resources) {
          SwrveLogger.info("resources readily available");
          callback(resources);
        } else {
          SwrveLogger.info("resources need to be retrieved");
          this.profileManager.clearEtagHeader();
          this.getCampaignsAndResources()
            .then((response) => {
              this.handleCampaignResponse(response);
              if (callback) {
                callback(
                  this.resourceManager.getResourceManager().getResources() || []
                );
              }
            })
            .catch((error) => {
              SwrveLogger.warn("getCampaigns failed ", error);
              if (callback) {
                callback([]);
              }
            });
        }
      });
  }

  public getResourceManager(): ResourceManager {
    return this.resourceManager.getResourceManager();
  }

  public getUserResourcesDiff(callback: GetUserResourcesDiffCallback): void {
    if (typeof callback !== "function") {
      SwrveLogger.error(
        SwrveConstants.INVALID_FUNCTION.replace("$", "getResources")
      );
      return;
    }

    const resourcesDiffKey =
      "resourcesDiff" + this.profileManager.currentUser.userId;

    this.getUserResourcesDiffInternal()
      .then(async (response) => {
        return this.storageManager
          .saveDataWithMD5Hash(resourcesDiffKey, JSON.stringify(response.data))
          .then(() => response.data);
      })
      .catch(async (error: any) => {
        SwrveLogger.warn("getUserResourcesDiff failed", error);
        return this.storageManager
          .getDataWithMD5Hash(resourcesDiffKey)
          .then((data) => (data ? JSON.parse(data) : []));
      })
      .then((json) => {
        const diff = this.transformResourcesDiff(json);
        if (callback) {
          callback(diff[0], diff[1], json);
        }
      });
  }

  //*****************************************************************************************************************/

  public showMessageCenterCampaign(
    campaign: ISwrveCampaign,
    personalizationProperties?: IDictionary<string>
  ): boolean {
    const properties = this.retrievePersonalizationProperties(
      {},
      personalizationProperties
    );
    return this.campaignManager.showCampaign(campaign, properties, (msg) =>
      this.queueMessageImpressionEvent(msg)
    );
  }

  public markMessageCenterCampaignAsSeen(campaign: ISwrveCampaign | number): void {
    if (typeof campaign === "number") {
      this.campaignManager.markCampaignAsSeenById(campaign);
    } else {
      this.campaignManager.markCampaignAsSeen(campaign);
    }
  }

  public removeMessageCenterCampaign(campaign: ISwrveCampaign | number): void {
    if (typeof campaign === "number") {
      this.campaignManager.removeMessageCenterCampaignById(campaign);
    } else {
      this.campaignManager.removeMessageCenterCampaign(campaign);
    }
  }

  public shutdown(): void {
    this._shutdown = true;
    this.evtManager.saveEventsToStorage(this.profileManager.currentUser.userId);
    clearTimeout(this.eventLoopTimer);
    this.profileManager.clearEtagHeader(); //TODO: WHAT?
  }

  public handleSendingQueue(): void {
    this.sendQueuedEvents();
  }

  public isCampaignCallPending(): boolean {
    return Boolean(
      this.storageManager.getData(SwrveConstants.CAMPAIGN_CALL_PENDING)
    );
  }

  private checkTriggers(triggerName: string, payload: object): void {
    const qa = this.profileManager.isQAUser();

    const personalization = this.retrievePersonalizationProperties(
      payload as IDictionary<string>
    );

    const { globalStatus, campaignStatus, campaigns } =
      this.campaignManager.checkTriggers(
        triggerName,
        payload,
        (msg) => this.queueMessageImpressionEvent(msg),
        qa,
        personalization
      );
    if (qa && globalStatus.status !== SwrveConstants.CAMPAIGN_MATCH) {
      SwrveLogger.debug(globalStatus.message);
      const event = this.eventFactory.getCampaignTriggeredEvent(
        triggerName,
        payload,
        globalStatus.message,
        "false"
      );
      const nextQASeqNum = this.profileManager.getNextSequenceNumber();
      this.qaLogging.campaignTriggeredEvent(nextQASeqNum, event);
    }
    if (qa && campaignStatus) {
      SwrveLogger.debug(campaignStatus.message);
      const displayed =
        campaignStatus.status === SwrveConstants.CAMPAIGN_MATCH
          ? "true"
          : "false";
      const event = this.eventFactory.getCampaignTriggeredEvent(
        triggerName,
        payload,
        campaignStatus.message,
        displayed,
        campaigns
      );
      const nextQASeqNum = this.profileManager.getNextSequenceNumber();
      this.qaLogging.campaignTriggeredEvent(nextQASeqNum, event);
    }
  }

  private makeIdentityCall(
    externalUserId: string,
    previousSwrveId: string,
    swrveId: string,
    onIdentifySuccess: OnIdentifySuccessCallback,
    onIdentifyError: OnIdentifyErrorCallback
  ): void {
    this.identifiedOnAnotherDevice = false; /* reset the flag */
    this.identifyUser(externalUserId, swrveId)
      .then((response) => response.data)
      .then((identity) => {
        this.profileManager.cacheExternalUserID(
          externalUserId,
          identity.swrve_id
        );
        if (
          identity.status === SwrveConstants.NEW_EXTERNAL_ID ||
          identity.status ===
            SwrveConstants.EXISTING_EXTERNAL_ID_MATCHES_SWRVE_ID
        ) {
          this.pauseSDK = false;
          if (previousSwrveId !== identity.swrve_id) {
            this.switchUser(identity.swrve_id, externalUserId);
          }
        } else if (identity.status === SwrveConstants.EXISTING_EXTERNAL_ID) {
          this.identifiedOnAnotherDevice = true;
          this.switchUser(identity.swrve_id, externalUserId);
        }

        this.profileManager.setUserIdAsVerified(
          this.profileManager.currentUser.userId
        );
        this.profileManager.setExternalUserId(externalUserId);
        onIdentifySuccess(identity.status, identity.swrve_id);
      })
      .catch((error) => {
        if (!this.identifiedOnlyTracking) {
          /* Carry on as anonymous and notify */
          this.pauseSDK = false;
        }
        if (onIdentifyError) {
          onIdentifyError(error);
        }
      });
  }

  private cleanUpCampaignCallPending(): void {
    if (this.campaignNetworkMonitorHandle !== undefined) {
      this.platform.stopMonitoringNetwork(this.campaignNetworkMonitorHandle);
      delete this.campaignNetworkMonitorHandle;
    }

    this.storageManager.clearData(SwrveConstants.CAMPAIGN_CALL_PENDING);
  }

  private cleanUpIdentifyCallPending(): void {
    if (this.identifyNetworkMonitorHandle !== undefined) {
      this.platform.stopMonitoringNetwork(this.identifyNetworkMonitorHandle);
      delete this.identifyNetworkMonitorHandle;
    }

    const anonId = this.storageManager.getData(
      SwrveConstants.IDENTIFY_CALL_PENDING
    );
    if (anonId) {
      this.sendQueuedEvents(anonId);
    }
    this.storageManager.clearData(SwrveConstants.IDENTIFY_CALL_PENDING);
    this.storageManager.clearData(
      SwrveConstants.IDENTIFY_CALL_PENDING_EXTERNAL_ID
    );
  }

  private createAnonymousUser(): void {
    this.profileManager.setCurrentUserAsNewAnonymousUser();
    this.campaignManager.resetCampaignState();
  }

  private switchUser(newUserId: string, externalUserId?: string): void {
    this.profileManager.setCurrentUser(newUserId, false, externalUserId);
    this.profileManager.setUserIdAsVerified(newUserId);
    this.realTimeUserPropertiesManager.loadStoredUserProperties(newUserId);
    this.campaignManager.loadStoredCampaigns(newUserId);
    this.startNewSession();
  }

  private startNewSession(): void {
    SwrveLogger.info("start new session");
    this.pauseSDK = false;
    this.autoShowEnabled = true; //reset this as it may have timed out

    if (!this.identifiedOnlyTracking) {
      this.initSDK(); //send all init events
    }

    this.queueDeviceProperties(); //send device props as at construction time we wait for PAL to send this but PAL is ready in this case

    if (this.eventLoopTimer === 0) {
      this.updateTimer(this.flushFrequency);
    }
  }

  private handleButtonClicked(
    button: ISwrveButton,
    message: ISwrveMessage,
    context?: IButtonClickContext
  ): void {
    const type = String(button.type.value);
    const action = String(button.action.value);
    /* The action and text may carry personalization, so resolve both before
       the action is opened or either is handed to the integrator - matching
       iOS (SwrveMessageUIView) and Android (InAppMessageHandler), which pass
       a resolved action and resolved text to their listeners. */
    const personalizationProperties = context
      ? context.personalizationProperties
      : undefined;
    const resolvedAction = this.resolvePersonalization(
      action,
      personalizationProperties
    );
    const resolvedText = button.text
      ? this.resolvePersonalization(
          String(button.text.value),
          personalizationProperties
        )
      : undefined;

    const clickEvent = this.eventFactory.getButtonClickEvent(
      this.profileManager.getNextSequenceNumber(),
      message,
      button.name,
      "false",
      context
    );
    const common = this.iamCommonPayload();
    clickEvent.payload.platform = common.platform;
    clickEvent.payload.deviceType = common.deviceType;
    this.queueEvent(clickEvent);

    this.qaLogging.buttonClickEvent(
      message.parentCampaign!,
      message.id,
      button.name,
      type,
      action || "No action",
      this.profileManager.getNextSequenceNumber()
    );

    if (type === SwrveConstants.CUSTOM && resolvedAction.match(/^https?:\/\//)) {
      this.platform.openLink(resolvedAction);
    }

    switch (type) {
      case SwrveConstants.DISMISS:
        this.notifyInAppMessageListener(
          SwrveMessageAction.Dismiss,
          this.getMessageDetails(message),
          this.getButtonDetails(button, resolvedAction, resolvedText)
        );
        break;
      case SwrveConstants.CUSTOM:
        this.notifyInAppMessageListener(
          SwrveMessageAction.Custom,
          this.getMessageDetails(message),
          this.getButtonDetails(button, resolvedAction, resolvedText)
        );
        break;
      default:
        break;
    }
  }

  private handleGenericCampaignEvent(
    event: Omit<IGenericCampaignEvent, "seqnum" | "time" | "type">
  ): void {
    // These are IAM events (page_view/navigation/dismiss/video_*); stamp the
    // common platform/deviceType fields, matching iOS/Android. Push-inbox
    // generic events are sent separately via PushInboxManager.
    const payload = {
      ...(event.payload || {}),
      ...this.iamCommonPayload(),
    };
    const evt = this.eventFactory.getGenericCampaignEvent(
      this.profileManager.getNextSequenceNumber(),
      event.campaignType,
      event.actionType,
      event.id,
      event.contextId,
      payload,
      event.mediaId
    );
    this.queueEvent(evt);
    this.qaLogging.genericCampaignEvent(evt);
  }

  private handleDataCaptureEvent(event: ISwrveDataCaptureEvent): void {
    this.queueDataCaptureEventsForButton(
      event.events,
      event.user_updates,
      event.personalizationProperties
    );
  }

  private queueDataCaptureEventsForButton(
    events: ReadonlyArray<ISwrveButtonEvent>,
    userUpdates: ReadonlyArray<ISwrveButtonPayloadItem>,
    personalizationProperties?: IDictionary<string>
  ): void {
    this.queueButtonEvents(events || [], personalizationProperties);
    this.queueButtonUserUpdates(userUpdates || [], personalizationProperties);
  }

  private queueButtonEvents(
    events: ReadonlyArray<ISwrveButtonEvent>,
    personalizationProperties?: IDictionary<string>
  ): void {
    events.forEach((buttonEvent) => {
      const payload = this.resolveButtonPayload(
        buttonEvent.payload || [],
        personalizationProperties
      ) as IDictionary<string | number>;

      this.validateEventName(buttonEvent.name);
      const evt = this.eventFactory.getNamedEvent(
        buttonEvent.name,
        payload,
        this.profileManager.getNextSequenceNumber(),
        DateHelper.nowInUtcTime()
      );

      this.queueEvent(evt);
      this.qaLogging.namedEvent(evt);
      this.checkTriggers(buttonEvent.name, payload);
    });
  }

  private queueButtonUserUpdates(
    userUpdates: ReadonlyArray<ISwrveButtonPayloadItem>,
    personalizationProperties?: IDictionary<string>
  ): void {
    const attributes = this.resolveButtonPayload(
      userUpdates,
      personalizationProperties
    );

    if (Object.keys(attributes).length === 0) {
      return;
    }

    const evt = this.eventFactory.getUserUpdate(
      attributes,
      this.profileManager.getNextSequenceNumber(),
      DateHelper.nowInUtcTime()
    );

    this.queueEvent(evt);
    this.qaLogging.userUpdate(evt);
  }

  private resolveButtonPayload(
    payloadItems: ReadonlyArray<ISwrveButtonPayloadItem>,
    personalizationProperties?: IDictionary<string>
  ): IDictionary<string | number | boolean> {
    const payload: IDictionary<string | number | boolean> = {};

    payloadItems.forEach((item) => {
      if (!item || !item.key) {
        return;
      }

      const value = this.resolveButtonPayloadValue(
        item.value,
        personalizationProperties
      );
      if (value !== null) {
        payload[item.key] = value;
      }
    });

    return payload;
  }

  private resolveButtonPayloadValue(
    value: string | number | boolean,
    personalizationProperties?: IDictionary<string>
  ): string | number | boolean | null {
    if (typeof value !== "string") {
      return value;
    }

    try {
      return TextTemplating.applyTextTemplatingToString(
        value,
        personalizationProperties
      );
    } catch (e) {
      SwrveLogger.debug("Could not resolve personalization for: " + value);
    }

    return null;
  }

  private autoShowMessages(): void {
    SwrveLogger.debug("auto show messages " + this.autoShowEnabled);
    if (!this.autoShowEnabled) {
      return;
    }

    this.checkTriggers(
      SwrveConstants.SWRVE_AUTOSHOW_AT_SESSION_START_TRIGGER,
      {}
    );
    this.autoShowEnabled = false;
  }

  private queueStartSessionEvent(): void {
    const event = this.eventFactory.getStartSessionEvent(
      this.profileManager.getNextSequenceNumber(),
      DateHelper.nowInUtcTime()
    );
    this.queueEvent(event);

    this.qaLogging.sessionStart(event);
  }

  private async getCampaignsAndResources(): Promise<
    IHttpResponse<ISwrveCampaignResourceResponse>
  > {
    const query = this.getQueryString(this.profileManager.currentUser.etag);
    const path = `${this.config.ContentUrl}/api/1/user_content?${query}`;
    SwrveLogger.info("update campagins: ", path);
    return await this.restClient.get<ISwrveCampaignResourceResponse>(path);
  }

  private async getUserResourcesDiffInternal(): Promise<
    IHttpResponse<ReadonlyArray<IResourceDiff>>
  > {
    const query = this.getQueryString();
    const path = `${this.config.ContentUrl}/api/1/user_resources_diff?${query}`;

    return await this.restClient.get<ReadonlyArray<IResourceDiff>>(path);
  }

  private getQueryString(etag?: string): string {
    const esc = encodeURIComponent;
    const params: IQueryParams = this.getContentRequestParams();

    const query = Object.keys(params)
      .filter((key) => (<any>params)[key] != null)
      .map((k) => esc(k) + "=" + esc((<any>params)[k]))
      .join("&");

    const etagParam = etag ? "&etag=" + etag : "";
    return (
      query +
      etagParam +
      "&session_token=" +
      this.profileManager!.getSessionToken()
    );
  }

  public getContentRequestParams(): IQueryParams {
    const params: IQueryParams = {
      api_key: this.config.ApiKey,
      user: this.profileManager.currentUser.userId,
      app_version: this.config.AppVersion,
      joined: this.profileManager.currentUser.firstUse.toString(),
      version: SWRVE_USER_CONTENT_API_VERSION,
      embedded_campaign_version: SWRVE_EMBEDDED_CAMPAIGN_VERSION,
      in_app_version: SWRVE_IN_APP_CAMPAIGN_VERSION,
      push_inbox_version: SWRVE_PUSH_INBOX_VERSION,
      language: this.platform.language,
      app_store: this.platform.appStore,
      device_width: this.platform.screenWidth.toString(),
      device_height: this.platform.screenHeight.toString(),
      device_dpi: this.platform.screenDPI.toString(),
      device_name: this.platform.deviceName,
      device_type: this.platform.deviceType,
      os: this.platform.os,
      os_version: this.platform.osVersion,
      orientation: "both",
    };

    return params;
  }

  public retrievePersonalizationProperties(
    eventPayload?: IDictionary<string>,
    properties?: IDictionary<string>
  ): IDictionary<string> {
    let processedRealTimeUserProperties: IDictionary<string> =
      RealTimeUserPropertiesManager.processForPersonalization(
        this.getRealTimeUserProperties()
      );
    let resultProperties = {};

    if (
      (!properties || Object.keys(properties).length == 0) &&
      this.config.PersonalizationProvider
    ) {
      const providerResult = this.config.PersonalizationProvider(
        eventPayload || {}
      );
      resultProperties = combineDictionaries(
        processedRealTimeUserProperties,
        providerResult
      );
    } else if (properties) {
      resultProperties = combineDictionaries(
        processedRealTimeUserProperties,
        properties
      );
    } else {
      resultProperties = processedRealTimeUserProperties;
    }

    return resultProperties;
  }

  private handleCampaignResponse(
    response: IHttpResponse<ISwrveCampaignResourceResponse>
  ): void {
    this.handleRealTimeUserProperties(response.data);
    this.handleCampaigns(response.data);
    this.handleResources(response.data);
    this.handleWebPushApi(response.data);
    this.handlePushInbox(response.data);

    if (response.etag != null) {
      this.profileManager.storeEtagHeader(response.etag);
    }
  }

  private sendCampaignsDownloadedEvent(): void {
    const ids = this.campaignManager.getCampaignIDs();

    if (ids.length > 0) {
      const nextSeqNum = this.profileManager.getNextSequenceNumber();
      this.qaLogging.campaignsDownloadedEvent(nextSeqNum, ids);
    }
  }

  private initSDK(): void {
    SwrveLogger.debug(
      "identified-only tracking: " +
        this.identifiedOnlyTracking +
        " isAnonymous: " +
        this.profileManager.currentUser.isAnonymous
    );
    if (
      !this.identifiedOnlyTracking ||
      this.profileManager.currentUser.isAnonymous == false
    ) {
      this.autoShowEnabled = false;
      const isValid = this.profileManager.hasSessionRestored();
      if (!isValid) {
        SwrveLogger.debug("setting autoShowBack to true");
        this.queueStartSessionEvent();
        this.checkFirstUserInitiated();
        this.autoShowEnabled = true;
      }

      this.disableAutoShowAfterDelay();
      this.sendQueuedEvents(this.profileManager.currentUser.userId, true);
      SwrveLogger.info("config: ", this.config.getReadonlyVersion());

      if (this.onSwrveCoreReadyCallback) {
        this.onSwrveCoreReadyCallback();
      }
    } else {
      SwrveLogger.debug("could not init SDK. user not identified.");
    }
  }

  private disableAutoShowAfterDelay(): void {
    setTimeout(() => {
      SwrveLogger.debug(
        "Auto show timed out " +
          this.config.InAppMessageConfig.autoShowMessagesMaxDelay
      );
      this.autoShowEnabled = false;
    }, this.config.InAppMessageConfig.autoShowMessagesMaxDelay);
  }

  private queueEvent(event: SwrveEvent): void {
    this.evtManager.queueEvent(event);

    if (this.evtManager.queueSize > this.evtManager.MAX_QUEUE_SIZE) {
      this.handleSendingQueue();
    }
  }

  private handleResources(response: ISwrveCampaignResourceResponse): void {
    if (response.user_resources) {
      this.resourceManager.storeResources(
        response.user_resources,
        this.profileManager.currentUser.userId
      );
      const resources = this.resourceManager
        .getResourceManager()
        .getResources();
      if (this.onResourcesLoadedCallback != null) {
        this.onResourcesLoadedCallback(resources || []);
      }
    } else {
      this.resourceManager
        .getResources(this.profileManager.currentUser.userId)
        .then((resources) => {
          if (this.onResourcesLoadedCallback != null) {
            this.onResourcesLoadedCallback(resources || []);
          }
        });
    }
  }

  private handleCampaigns(response: ISwrveCampaignResourceResponse): void {
    if (response && Object.keys(response).length !== 0) {

      const personalizationProperties = this.retrievePersonalizationProperties();

      this.campaignManager.storeCampaigns(response, personalizationProperties, () => {
        SwrveLogger.debug("assets looaded");
        this.autoShowMessages();
      });
      this.handleQAUser(response);
      this.handleFlushRefresh(response);

      if (this.onCampaignLoadedCallback) {
        this.onCampaignLoadedCallback();
      }

      this.sendCampaignsDownloadedEvent();
    }
  }

  private handleRealTimeUserProperties(
    response: ISwrveCampaignResourceResponse
  ): void {
    this.realTimeUserPropertiesManager.storeUserProperties(response);
  }

  private handleUpdate(): void {
    if (this.evtManager.getQueue().length > 0) {
      this.handleSendingQueue();
    }
  }

  private async identifyUser(
    thirdPartyLoginId: string,
    swrveId: string
  ): Promise<IHttpResponse<IdentityResponse>> {
    const path = this.config.IdentityUrl;
    const body: IIdentityParams = {
      api_key: this.config.ApiKey,
      swrve_id: swrveId,
      external_user_id: thirdPartyLoginId,
      unique_device_id: this.platform.deviceID,
    };

    return await this.restClient.post<IIdentityParams, IdentityResponse>(
      path,
      body
    );
  }

  private handleQAUser(response: ISwrveCampaignResourceResponse): void {
    if (response.qa) {
      this.profileManager.setAsQAUser(response.qa);
      this.qaLogging.startQALogTimer();
    } else {
      this.profileManager.clearQAUser();
      this.qaLogging.stopQALogTimer();
    }
  }

  private handleWebPushApi(response: ISwrveCampaignResourceResponse): void {
    if (
      response.web_push_public_key &&
      this.webPushApiKey !== response.web_push_public_key
    ) {
      this.webPushApiKey = response.web_push_public_key;
      this.config.WebPushConfig.webApiKeyCallback(
        this.webPushApiKey,
        this.config.WebPushConfig.autoPushSubscribe
      );
    }
  }

  private handlePushInbox(response: ISwrveCampaignResourceResponse): void {
    if (response.push_inbox) {
      this.pushInboxManager.updatePushInbox(response.push_inbox);
    }

    if (response.push_inbox_hash) {
      const storedHash = this.pushInboxManager.getStoredHash();
      const hashChanged = storedHash !== response.push_inbox_hash;
      this.pushInboxManager.storeHash(response.push_inbox_hash);

      if (hashChanged && this.onPushInboxUpdatedCallback) {
        this.onPushInboxUpdatedCallback();
      }
    }
  }

  private handleFlushRefresh(response: ISwrveCampaignResourceResponse): void {
    const flushFrequency = response.flush_frequency || 30000;
    this.updateTimer(flushFrequency);
  }

  private updateTimer(flushFrequency: number): void {
    if (this.eventLoopTimer === 0) {
      //first time
      this.flushFrequency = flushFrequency;
      this.eventLoopTimer = setInterval(
        () => this.handleUpdate(),
        flushFrequency
      );
    } else if (this.flushFrequency !== flushFrequency) {
      //only reset it if it different
      this.flushFrequency = flushFrequency;
      if (this.eventLoopTimer !== 0) {
        clearInterval(this.eventLoopTimer);
      }
      this.eventLoopTimer = setInterval(
        () => this.handleUpdate(),
        flushFrequency
      );
    }
  }

  private validateEventName(name: string): void {
    if (name == null || name.trim() === '') {
      throw new Error(SwrveConstants.EMPTY_EVENT_NAME);
    }

    const isSafelisted = name.startsWith('Swrve.permission.web.push_notifications');

    // Only block "swrve" events if they're NOT in the safelist
    if (/[Ss]wrve/.test(name) && !isSafelisted) {
      throw new Error(SwrveConstants.INVALID_EVENT_NAME);
    }
  }

  private checkFirstUserInitiated(): void {
    const currentUser = this.profileManager.currentUser;
    if (
      (currentUser && currentUser.firstUse === 0) ||
      currentUser.firstUse === undefined
    ) {
      SwrveLogger.debug("First session on device detected. logging...");
      currentUser.firstUse = DateHelper.nowInUtcTime();
      if (this.identifiedOnAnotherDevice === false) {
        const evt = this.eventFactory.getFirstInstallEvent(
          currentUser.firstUse,
          this.profileManager.getNextSequenceNumber()
        );
        this.queueEvent(evt);
        this.qaLogging.namedEvent(evt);
      }
    }
  }

  private loadInstallDate(): void {
    const storedInstallDate = this.storageManager.getData("firstInstallDate");
    if (storedInstallDate != null && storedInstallDate !== "") {
      this.installDate = storedInstallDate;
    }

    if (this.installDate.length < 1) {
      this.installDate = getInstallDateFormat(DateHelper.nowInUtcTime());
      this.storageManager.saveData(
        "firstInstallDate",
        String(this.installDate)
      );
    }
  }

  private queueDeviceProperties(): void {
    const deviceProperties = queryDeviceProperties(
      this.platform,
      this.installDate
    );
    const evt = this.eventFactory.getDeviceUpdate(
      deviceProperties,
      this.profileManager.getNextSequenceNumber(),
      DateHelper.nowInUtcTime()
    );

    this.queueEvent(evt);

    this.qaLogging.deviceUpdate(evt);

    SwrveLogger.info("device properties: ", deviceProperties);
  }

  private transformResourcesDiff(
    resources: ReadonlyArray<IResourceDiff>
  ): [IDictionary<IUserResource>, IDictionary<IUserResource>] {
    const mapOldResources: IDictionary<IUserResource> = {};
    const mapNewResources: IDictionary<IUserResource> = {};
    resources.forEach((resource) => {
      const mapOldResourceValues: IUserResource = {};
      const mapNewResourceValues: IUserResource = {};
      for (const key in resource.diff) {
        if (resource.diff.hasOwnProperty(key)) {
          mapOldResourceValues[key] = resource.diff[key].old;
          mapNewResourceValues[key] = resource.diff[key].new;
        }
      }
      mapOldResources[resource.uid] = mapOldResourceValues;
      mapNewResources[resource.uid] = mapNewResourceValues;
    });

    return [mapOldResources, mapNewResources];
  }

  private pageStateHandler(): void {
    /** Store all user data before page close or focus out */
    this.profileManager.saveCurrentUserBeforeSessionEnd();
  }
}

export interface IDependencies {
  campaignManager?: CampaignManager;
  eventManager?: EventManager;
  profileManager?: ProfileManager;
  restClient?: IRestClient;
  platform: IPlatform;
}
