import {
  ISwrveConfig,
  ISwrveEmbeddedMessageConfig,
  ISwrveInAppMessageConfig,
  ISwrveWebPushConfig,
  OnPersonalizationProvider,
  Stack,
} from "../interfaces/ISwrveConfig";

class SwrveConfig {
  private appVersion: string;
  private appID: number;
  private apiKey: string;
  private eventsUrl: string;
  private contentUrl: string;
  private identityUrl: string;
  private appStore: string;
  private language: string;
  private newSessionInterval: number;
  private httpsTimeoutSeconds: number;
  private stack: Stack;
  private inAppMessageConfig: ISwrveInAppMessageConfig;
  private embeddedMessageConfig: ISwrveEmbeddedMessageConfig;
  private webPushConfig: ISwrveWebPushConfig;
  private personalizationProvider: OnPersonalizationProvider | null;
  private externalUserId: string | null;

  public constructor(config: ISwrveConfig) {
    this.appID = config.appId;
    this.apiKey = config.apiKey;
    this.stack = config.stack || "us";
    this.language = config.language || "English";
    this.newSessionInterval =
      config.newSessionInterval || 1800; /** 30 minutes in seconds */
    this.eventsUrl = this.resolveEventsUrl(config);
    this.contentUrl = this.resolveContentUrl(config);
    this.identityUrl = this.resolveIdentityUrl(config);
    this.appVersion = config.appVersion || "1.0";
    this.appStore = config.appStore || "web";
    this.httpsTimeoutSeconds = config.httpsTimeoutSeconds || 10;
    this.inAppMessageConfig = config.inAppMessageConfig || {
      autoShowMessagesMaxDelay: 5000,
    };
    this.externalUserId = config.externalUserId || null;
    this.embeddedMessageConfig = config.embeddedMessageConfig || {};
    this.personalizationProvider = config.personalizationProvider || null;
    this.webPushConfig = config.webPushConfig || {
      webApiKeyCallback: (...args: any[]) => {},
      autoPushSubscribe: false,
    };
  }

  public get AppID(): number {
    return this.appID;
  }

  public get ApiKey(): string {
    return this.apiKey;
  }

  public get EventsUrl(): string {
    return this.eventsUrl;
  }

  public get ContentUrl(): string {
    return this.contentUrl;
  }

  public get IdentityUrl(): string {
    return this.identityUrl;
  }

  public get Stack(): Stack {
    return this.stack;
  }

  public get AppVersion(): string {
    return this.appVersion;
  }

  public get AppStore(): string {
    return this.appStore;
  }

  public get HttpsTimeoutSeconds(): number {
    return this.httpsTimeoutSeconds;
  }

  public get StartupExternalUserId(): string | null {
    return this.externalUserId;
  }

  public get Language(): string {
    return this.language;
  }

  public get NewSessionInterval(): number {
    return this.newSessionInterval;
  }

  public get InAppMessageConfig(): ISwrveInAppMessageConfig {
    return this.inAppMessageConfig;
  }

  public get EmbeddedMessageConfig(): ISwrveEmbeddedMessageConfig {
    return this.embeddedMessageConfig;
  }

  public get PersonalizationProvider(): OnPersonalizationProvider | null  {
    return this.personalizationProvider;
  }

  public get WebPushConfig(): ISwrveWebPushConfig {
    return this.webPushConfig;
  }

  public getReadonlyVersion(): Readonly<ISwrveConfig> {
    return {
      appId: this.appID,
      apiKey: this.ApiKey,
      stack: this.stack,
      httpsTimeoutSeconds: this.HttpsTimeoutSeconds,
      contentUrl: this.ContentUrl,
      eventsUrl: this.EventsUrl,
      identityUrl: this.IdentityUrl,
      appStore: this.AppStore,
      appVersion: this.AppVersion,
      language: this.Language,
      newSessionInterval: this.NewSessionInterval,
      inAppMessageConfig: this.InAppMessageConfig,
      embeddedMessageConfig: this.embeddedMessageConfig,
      personalizationProvider: this.personalizationProvider,
      webPushConfig: this.webPushConfig
    } as ISwrveConfig;
  }

  private resolveEventsUrl(config: ISwrveConfig): string {
    const stackResult = config.stack === "eu" ? "eu-api" : "api";
    return (
      config.eventsUrl || `https://${config.appId}.${stackResult}.swrve.com`
    );
  }

  private resolveContentUrl(config: ISwrveConfig): string {
    const stackResult = config.stack === "eu" ? "eu-content" : "content";
    return (
      config.contentUrl || `https://${config.appId}.${stackResult}.swrve.com`
    );
  }

  private resolveIdentityUrl(config: ISwrveConfig): string {
    const stackResult = this.stack === "eu" ? "eu-identity" : "identity";
    return (
      config.identityUrl ||
      `https://${config.appId}.${stackResult}.swrve.com/identify`
    );
  }
}

export default SwrveConfig;
