import { EventFactory } from "./Events/EventFactory";
import { ProfileManager } from "./Profile/ProfileManager";
import { CampaignManager } from "./Campaigns/CampaignManager";
import {
  ISwrveBaseMessage,
  ISwrveButton,
  ISwrveCampaign,
  ISwrveCampaignResourceResponse,
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
  OnCustomButtonClicked,
  OnIAMDismissed,
  OnIdentifyErrorCallback,
  OnIdentifySuccessCallback,
  OnMessageListener,
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
  SWRVE_USER_CONTENT_API_VERSION,
} from "./utils/SwrveConstants";
import { IQueryParams } from "./interfaces/IQueryParams";
import IRestClient from "./interfaces/IRestClient";
import SwrveConfig from "./Config/SwrveConfig";
import { generateUuid } from "./utils/uuid";
import { QALogging } from "./Events/QALogging";
import IHttpResponse from "./interfaces/IHttpResponse";
import { ISwrveMessage } from "./interfaces/ISwrveCampaign";
import { combineDictionaries } from "./utils/DictionaryHelper";
import { TextTemplating } from "./utils/TextTemplating";
import DateHelper from "./utils/DateHelper";

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

  private onResourcesLoadedCallback: OnResourcesLoadedCallback | null = null;
  private onCampaignLoadedCallback: OnCampaignLoadedCallback | null = null;
  private onCustomButtonClickedCallback: OnCustomButtonClicked | null = null;
  private onIAMDismissedCallback: OnIAMDismissed | null = null;
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
        this.config,
        this.getResourceManager()
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

    this.campaignManager.onButtonClicked((button, message) =>
      this.handleButtonClicked(button, message)
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
    personalizationProperties?: IDictionary<String>
  ): ISwrveCampaign[] {
    return this.campaignManager.getMessageCenterCampaigns();
  }

  //************************************ EVENTS ********************************************************************/

  public event(keyName: string, payload: IDictionary<string | number>): void {
    if (this.pauseSDK) return;

    this.validateEventName(keyName);

    const evt = this.eventFactory.getNamedEvent(
      keyName,
      payload,
      this.profileManager.getNextSequenceNumber(),
      Date.now()
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
      Date.now()
    );
    this.queueEvent(evt);

    this.qaLogging.userUpdateWithDate(evt);
  }

  public userUpdate(
    attributes: IReadonlyDictionary<string | number | boolean>
  ): void {
    if (this.pauseSDK) return;

    const evt = this.eventFactory.getUserUpdate(
      attributes,
      this.profileManager.getNextSequenceNumber(),
      Date.now()
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
      Date.now()
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
      Date.now(),
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
      Date.now()
    );

    this.queueEvent(evt);

    this.qaLogging.currencyGivenEvent(evt);
  }

  public sendQueuedEvents(
    userId: string = this.profileManager.currentUser.userId,
    forceUpdate: boolean = false
  ): void {
    SwrveLogger.info("SWRVE INTERNAL: SEND QUEUED EVENTS");
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

  public notificationEngagedEvent(campaignId: number): void {
    const eventName = `Swrve.Messages.Push-${campaignId}.engaged`;
    const evt = this.eventFactory.getNamedEvent(
      eventName,
      {},
      this.profileManager.getNextSequenceNumber(),
      Date.now()
    );

    this.queueEvent(evt);

    this.qaLogging.namedEvent(evt);
  }

  public notificationDeliveredEvent(campaignId: number): void {
    const eventName = `Swrve.Messages.Push-${campaignId}.delivered`;
    const evt = this.eventFactory.getNamedEvent(
      eventName,
      {},
      this.profileManager.getNextSequenceNumber(),
      Date.now()
    );

    this.queueEvent(evt);

    this.qaLogging.namedEvent(evt);
  }

  //******************************************** Embedded Campaigns ********************************************/

  public embeddedMessageWasShownToUser(message: ISwrveEmbeddedMessage): void {
    this.campaignManager.updateCampaignState(message);
    this.handleMessage(message, { embedded: "true" });
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
        SwrveLogger.error("Could not resolve, error with personalization", e);
      }
    }

    return null;
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
    SwrveLogger.info("updateCampaignsAndResources");
    return this.getCampaignsAndResources()
      .then((response) => {
        this.handleCampaignResponse(response);

        if (this.isCampaignCallPending()) {
          this.cleanUpCampaignCallPending();
        }
      })
      .catch((error) => {
        SwrveLogger.warn("getCampaigns failed ", error);

        if (!this.isCampaignCallPending()) {
          this.campaignNetworkMonitorHandle = this.platform.monitorNetwork(
            (state) => {
              if (state === NETWORK_CONNECTED) {
                SwrveLogger.info(
                  "NETWORK RECONNECTED - RETRY CAMPAIGNS AND RESOURCES"
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

  public handleMessage(
    message: ISwrveBaseMessage,
    payload?: IDictionary<string | number>
  ): void {
    const nextSeqNum = this.profileManager.getNextSequenceNumber();
    if (!payload) {
      payload = { embedded: "false" };
    }

    const evt = this.eventFactory.getImpressionEvent(
      message,
      nextSeqNum,
      payload
    );

    this.queueEvent(evt);
    this.qaLogging.namedEvent(evt);
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

  public onMessage(callback: OnMessageListener): void {
    if (typeof callback !== "function") {
      SwrveLogger.error(
        SwrveConstants.INVALID_FUNCTION.replace("$", "onMessage")
      );
      return;
    }

    this.campaignManager.onMessage(callback);
  }

  public onIAMDismissed(callback: OnIAMDismissed): void {
    if (typeof callback !== "function") {
      SwrveLogger.error(
        SwrveConstants.INVALID_FUNCTION.replace("$", "onIAMDismissed")
      );
      return;
    }

    this.onIAMDismissedCallback = callback;
  }

  public onCustomButtonClicked(callback: OnCustomButtonClicked): void {
    if (typeof callback !== "function") {
      SwrveLogger.error(
        SwrveConstants.INVALID_FUNCTION.replace("$", "onCustomButtonClicked")
      );
      return;
    }

    this.onCustomButtonClickedCallback = callback;
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
          SwrveLogger.info("RESOURCES READILY AVAILABLE");
          callback(resources);
        } else {
          SwrveLogger.info("RESOURCES NEED TO BE RETRIEVED");
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

  public showCampaign(
    campaign: ISwrveCampaign,
    personalizationProperties?: IDictionary<string>
  ): boolean {
    const properties = this.retrievePersonalizationProperties(
      {},
      personalizationProperties
    );
    return this.campaignManager.showCampaign(campaign, properties);
  }

  public markMessageCenterCampaignAsSeen(campaign: ISwrveCampaign): void {
    this.campaignManager.markCampaignAsSeen(campaign);
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
        (msg) => this.handleMessage(msg),
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
    SwrveLogger.info("Start new session");
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
    message: ISwrveMessage
  ): void {
    const type = String(button.type.value);
    const action = String(button.action.value);

    this.queueEvent(
      this.eventFactory.getButtonClickEvent(
        this.profileManager.getNextSequenceNumber(),
        message,
        button.name,
        "false"
      )
    );

    this.qaLogging.buttonClickEvent(
      message.parentCampaign!,
      message.id,
      button.name,
      type,
      action || "No action",
      this.profileManager.getNextSequenceNumber()
    );

    if (type === SwrveConstants.DISMISS && this.onIAMDismissedCallback) {
      this.onIAMDismissedCallback();
    } else if (type === SwrveConstants.CUSTOM) {
      if (action.match(/^https?:\/\//)) {
        this.platform.openLink(action);
      }

      if (this.onCustomButtonClickedCallback) {
        this.onCustomButtonClickedCallback(action);
      }
    }
  }

  private autoShowMessages(): void {
    SwrveLogger.debug("AUTO SHOW MESSAGES " + this.autoShowEnabled);
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
      Date.now()
    );
    this.queueEvent(event);

    this.qaLogging.sessionStart(event);
  }

  private async getCampaignsAndResources(): Promise<
    IHttpResponse<ISwrveCampaignResourceResponse>
  > {
    const query = this.getQueryString(this.profileManager.currentUser.etag);
    const path = `${this.config.ContentUrl}/api/1/user_content?${query}`;

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
      language: this.platform.language,
      app_store: this.platform.appStore,
      device_width: this.platform.screenWidth.toString(),
      device_height: this.platform.screenHeight.toString(),
      device_dpi: this.platform.screenDPI.toString(),
      device_name: this.platform.deviceName,
      device_type: this.platform.deviceType,
      os: this.platform.os,
      os_version: this.platform.osVersion,
      orientation: "landscape",
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
      "Identified-only tracking: " +
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
        SwrveLogger.debug("Setting autoShowBack to true");
        this.queueStartSessionEvent();
        this.checkFirstUserInitiated();
        this.autoShowEnabled = true;
      }

      this.disableAutoShowAfterDelay();
      this.sendQueuedEvents(this.profileManager.currentUser.userId, true);
      SwrveLogger.info("Swrve Config: ", this.config.getReadonlyVersion());

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
        "AUTO SHOW TIMED OUT " +
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
      this.campaignManager.storeCampaigns(response, () => {
        SwrveLogger.debug("ON ASSETS LOADED");
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
    if (/[Ss]wrve/.exec(name)) {
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
      currentUser.firstUse = Date.now();
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
      this.installDate = getInstallDateFormat(Date.now());
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
      Date.now()
    );

    this.queueEvent(evt);

    this.qaLogging.deviceUpdate(evt);

    SwrveLogger.info("Swrve Device Properties: ", deviceProperties);
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
