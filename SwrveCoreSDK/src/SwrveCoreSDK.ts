import { IDependencies, Swrve } from "./Swrve";
import { ResourceManager } from "./Resources/ResourceManager";
import {
  ISwrveCampaign,
  ISwrveMessage,
  ISwrveEmbeddedMessage,
  IUserResource,
} from "./interfaces/ISwrveCampaign";
import { IUserInfo } from "./interfaces/IUser";
import { ISwrveConfig } from "./interfaces/ISwrveConfig";
import IDictionary from "./interfaces/IDictionary";
import IReadonlyDictionary from "./interfaces/IReadonlyDictionary";
import { GET_INSTANCE_ERROR } from "./utils/SwrveConstants";
import IReward from "./interfaces/IReward";
import IPushEvent from "./interfaces/IPushEvent";
import { IPlatform } from "./interfaces/IPlatform";
import SwrveEvent from "./WebApi/Events/SwrveEvent";

let swrve: Swrve | null = null;

export type OnResourcesLoadedCallback = (
  resources: ReadonlyArray<IUserResource> | null
) => void;
export type OnCampaignLoadedCallback = () => void;
export type GetResourcesCallback = (
  resources: ReadonlyArray<IUserResource>
) => void;
export type GetUserResourcesDiffCallback = (
  oldDictionary: IDictionary<IUserResource>,
  newDictionary: IDictionary<IUserResource>,
  json: any
) => any;
export type OnIdentifySuccessCallback = (
  status: string,
  swrveUserId: string
) => void;
export type OnIdentifyErrorCallback = (error: string) => void;
export type OnSwrveCoreReadyCallback = () => void;
export type OnMessageListener = (msg: ISwrveMessage) => void;
export type OnIAMDismissed = () => void;
export type OnCustomButtonClicked = (customString: string) => void;

export class SwrveCoreSDK {
  private static _instance: SwrveCoreSDK | null = null;

  public static createInstance(
    config: ISwrveConfig,
    dependencies: IDependencies
  ): SwrveCoreSDK {
    if (SwrveCoreSDK._instance) {
      return SwrveCoreSDK._instance;
    } else {
      SwrveCoreSDK._instance = new SwrveCoreSDK(config, dependencies);
      return SwrveCoreSDK._instance;
    }
  }

  private constructor(config: ISwrveConfig, dependencies: IDependencies) {
    swrve = new Swrve(config, dependencies);
  }

  public init(callback?:OnSwrveCoreReadyCallback): void {
    SwrveCoreSDK.checkInstance().init(callback);
  }

  private static checkInstance(): Swrve {
    if (swrve == null) {
      throw Error(GET_INSTANCE_ERROR);
    }

    return swrve;
  }

  //*************************************** Lifecycle / Account Management ************************************//

  public static identify(
    externalUserId: string,
    onIdentifySuccess: OnIdentifySuccessCallback,
    onIdentifyError: OnIdentifyErrorCallback
  ): void {
    SwrveCoreSDK.checkInstance().identify(
      externalUserId,
      onIdentifySuccess,
      onIdentifyError
    );
  }

  public static start(userId?: string): void {
    //TODO: Not implemented yet
    throw "This method has not been implemented yet";
  }

  public static started(): boolean {
    //TODO: Not implemented yet
    throw "This method has not been implemented yet";
  }

  public static stopTracking(): void {
    SwrveCoreSDK.checkInstance().stop();
  }

  public static saveToStorage(): void {
    SwrveCoreSDK.checkInstance().saveToStorage();
  }

  public static shutdown(): void {
    SwrveCoreSDK.checkInstance().shutdown();

    swrve = null;
    SwrveCoreSDK._instance = null;
  }

  //******************************** Callbacks ****************************************************//

  public static onResourcesLoaded(callback: OnResourcesLoadedCallback): void {
    SwrveCoreSDK.checkInstance().onResourcesLoaded(callback);
  }

  public static onCampaignLoaded(callback: OnCampaignLoadedCallback): void {
    SwrveCoreSDK.checkInstance().onCampaignLoaded(callback);
  }

  public static onMessage(callback: OnMessageListener): void {
    SwrveCoreSDK.checkInstance().onMessage(callback);
  }

  public static onIAMDismissed(callback: OnIAMDismissed): void {
    SwrveCoreSDK.checkInstance().onIAMDismissed(callback);
  }

  public static onCustomButtonClicked(callback: OnCustomButtonClicked): void {
    SwrveCoreSDK.checkInstance().onCustomButtonClicked(callback);
  }

  //******************************** Accessor methods *********************************************//

  public static getConfig(): Readonly<ISwrveConfig> {
    return SwrveCoreSDK.checkInstance().getConfig();
  }

  public static getPlatform(): IPlatform {
    return SwrveCoreSDK.checkInstance().getPlatform();
  }

  public static getInstance(): SwrveCoreSDK {
    if (SwrveCoreSDK._instance == null) {
      throw new Error(GET_INSTANCE_ERROR);
    }

    return SwrveCoreSDK._instance;
  }

  public static getUserInfo(): IUserInfo {
    return SwrveCoreSDK.checkInstance().getUserInfo();
  }

  public static getUserId(): string {
    return SwrveCoreSDK.checkInstance().getUserId();
  }

  public static getExternalUserId(): string | null {
    return SwrveCoreSDK.checkInstance().getExternalUserId();
  }

  public static getSDKVersion(): string {
    return SwrveCoreSDK.checkInstance().getSDKVersion();
  }

  //*************************************** Event Management ************************************//

  public static event(
    name: string,
    payload: IDictionary<string | number> = {}
  ): void {
    SwrveCoreSDK.checkInstance().event(name, payload);
  }

  public static deviceUpdate(attributes: IReadonlyDictionary<string | number>): void {
    SwrveCoreSDK.checkInstance().deviceUpdate(attributes);
  }

  public static userUpdate(
    attributes: IReadonlyDictionary<string | number | boolean>
  ): void {
    SwrveCoreSDK.checkInstance().userUpdate(attributes);
  }

  public static userUpdateWithDate(keyName: string, date: Date): void {
    SwrveCoreSDK.checkInstance().userUpdateWithDate(keyName, date);
  }

  public static purchase(
    name: string,
    currency: string,
    cost: number,
    quantity: number
  ): void {
    SwrveCoreSDK.checkInstance().purchase(name, currency, cost, quantity);
  }

  public static iap(
    quantity: number,
    productId: string,
    productPrice: number,
    currency: string,
    rewards?: IReadonlyDictionary<IReward>
  ): void {
    SwrveCoreSDK.checkInstance().iap(
      quantity,
      productId,
      productPrice,
      currency,
      rewards
    );
  }

  public static currencyGiven(currencyGiven: string, amount: number): void {
    SwrveCoreSDK.checkInstance().currencyGiven(currencyGiven, amount);
  }

  public static sendQueuedEvents(): void {
    SwrveCoreSDK.checkInstance().sendQueuedEvents();
  }

  public static getQueuedEvents(): SwrveEvent[] {
    return SwrveCoreSDK.checkInstance().getQueuedEvents();
  }

  //*************************************** User Resources *******************************//

  public static getResourceManager(): ResourceManager {
    return SwrveCoreSDK.checkInstance().getResourceManager();
  }

  public static getUserResources(callback: GetResourcesCallback): void {
    SwrveCoreSDK.checkInstance().getResources(callback);
  }

  public static getUserResourcesDiff(
    callback: GetUserResourcesDiffCallback
  ): void {
    SwrveCoreSDK.checkInstance().getUserResourcesDiff(callback);
  }

  public static getRealTimeUserProperties(): IDictionary<string> {
    return SwrveCoreSDK.checkInstance().getRealTimeUserProperties();
  }

  //*************************************** Embedded Campaigns *****************************//

  public static embeddedMessageWasShownToUser(message: ISwrveEmbeddedMessage) {
    SwrveCoreSDK.checkInstance().embeddedMessageWasShownToUser(message);
  }

  public static embeddedMessageButtonWasPressed(
    message: ISwrveEmbeddedMessage,
    buttonName: string
  ) {
    SwrveCoreSDK.checkInstance().embeddedMessageButtonWasPressed(
      message,
      buttonName
    );
  }

  public static getPersonalizedEmbeddedMessageData(
    message: ISwrveEmbeddedMessage,
    personalizationProperties: IDictionary<string>
  ): string | null {
    return SwrveCoreSDK.checkInstance().getPersonalizedEmbeddedMessageData(
      message,
      personalizationProperties
    );
  }

  public static getPersonalizedText(
    text: string,
    personalizationProperties: IDictionary<string>
  ): string | null {
    return SwrveCoreSDK.checkInstance().getPersonalizedText(
      text,
      personalizationProperties
    );
  }

  //*************************************** Message Center *******************************//

  public static getMessageCenterCampaigns(
    personalizationProperties?: IDictionary<string>
  ): ISwrveCampaign[] {
    return SwrveCoreSDK.checkInstance().getMessageCenterCampaigns(
      personalizationProperties
    );
  }

  public static showMessageCenterCampaign(
    campaign: ISwrveCampaign,
    personalizationProperties?: IDictionary<string>
  ): boolean {
    return SwrveCoreSDK.checkInstance().showCampaign(
      campaign,
      personalizationProperties
    );
  }

  public static markMessageCenterCampaignAsSeen(
    campaign: ISwrveCampaign
  ): void {
    SwrveCoreSDK.checkInstance().markMessageCenterCampaignAsSeen(campaign);
  }

  //**************************************** Push Only **********************************//

  public static getWebPushApiKey(): string {
    return SwrveCoreSDK.checkInstance().getWebPushApiKey();
  }

  public static notificationDeliveredEvent(campaignId: number): void {
    SwrveCoreSDK.checkInstance().notificationDeliveredEvent(campaignId);
  }

  public static notificationEngagedEvent(campaignId: number): void {
    SwrveCoreSDK.checkInstance().notificationEngagedEvent(campaignId);
  }

  public static enqueuePushEvents(events: IPushEvent[]): void {
    SwrveCoreSDK.checkInstance().enqueuePushEvents(events);
  }
}
