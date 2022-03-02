import IDictionary from "./IDictionary";
import { ISwrveEmbeddedMessage } from "./ISwrveCampaign";

export type Stack = 'us'|'eu';

export declare type OnEmbeddedMessageListener = (msg: ISwrveEmbeddedMessage, personalizationProperties?: IDictionary<string>) => void;
export declare type OnPersonalizationProvider = (eventPayload: IDictionary<string>) => IDictionary<string> ;
export declare type OnWebPushAPIKeyListener = (key: string, autoSubscribe: boolean) => void;

export interface ICSSStyle {
  [key: string]: string;
}

export interface ISwrveInAppMessageConfig {
  autoShowMessagesMaxDelay: number;
  defaultBackgroundColor?: string;
  defaultButtonStyle?: ICSSStyle | string;
  defaultButtonFocusStyle?: ICSSStyle | string;
  /**TODO: add custom button / dismiss / other button listeners */
}

export interface ISwrveEmbeddedMessageConfig {
  embeddedCallback?: OnEmbeddedMessageListener;
}

export interface ISwrveWebPushConfig {
  webApiKeyCallback: OnWebPushAPIKeyListener;
  autoPushSubscribe: boolean;
}

export interface ISwrveConfig {
  appId: number;
  apiKey: string;
  stack?: Stack;
  httpsTimeoutSeconds?: number;
  contentUrl?: string;
  eventsUrl?: string;
  identityUrl?: string;
  appStore?: string;
  appVersion?: string;
  language?: string;
  newSessionInterval?: number;
  autoStartLastUser?: boolean;
  externalUserId?: string;
  inAppMessageConfig?: ISwrveInAppMessageConfig;
  embeddedMessageConfig?: ISwrveEmbeddedMessageConfig;
  webPushConfig?: ISwrveWebPushConfig;
  personalizationProvider?: OnPersonalizationProvider;
}
