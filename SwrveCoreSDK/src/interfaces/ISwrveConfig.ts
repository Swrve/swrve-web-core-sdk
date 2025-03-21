import IDictionary from "./IDictionary";
import { ISwrveEmbeddedMessage, ISwrveMessage } from "./ISwrveCampaign";

export type Stack = 'us'|'eu';

export declare type OnEmbeddedMessageListener = (msg: ISwrveEmbeddedMessage, personalizationProperties?: IDictionary<string>) => void;
export declare type OnPersonalizationProvider = (eventPayload: IDictionary<string>) => IDictionary<string> ;
export declare type OnWebPushAPIKeyListener = (key: string, autoSubscribe: boolean) => void;
export declare type OnDismissButtonListener = () => void;
export declare type OnCustomButtonListener = (customString: string) => void;
export declare type OnClipboardButtonListener = (clipboardContents: string) => void;
export declare type OnMessageListener = (msg: ISwrveMessage) => void;

export interface ICSSStyle {
  [key: string]: string;
}

export interface ISwrveInAppMessageConfig {
  autoShowMessagesMaxDelay: number;
  defaultBackgroundColor?: string;
  defaultButtonFocusStyle?: ICSSStyle | string;
  defaultTextForegroundColor?: string;
  defaultTextBackgroundColor?: string;
  defaultTextFontStyle?: string;
  customButtonListener?: OnCustomButtonListener;
  clipboardButtonListener?: OnClipboardButtonListener;
  dismissButtonListener?: OnDismissButtonListener;
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
