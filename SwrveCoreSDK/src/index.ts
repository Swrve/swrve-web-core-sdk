import { OnIdentifyErrorCallback, OnIdentifySuccessCallback, OnSwrveCoreReadyCallback, SwrveCoreSDK } from "./SwrveCoreSDK";
import {
  DevicePropertyName,
  IPlatform,
  IPlatformName,
  NetworkListener,
  NetworkMonitorHandle,
  NetworkStatus,
  NETWORK_CONNECTED,
  NETWORK_DISCONNECTED,
} from "./interfaces/IPlatform";
import {
  ISwrveConfig,
  ISwrveEmbeddedMessageConfig,
  ISwrveInAppMessageConfig,
  ISwrveWebPushConfig,
  OnEmbeddedMessageListener,
  OnPersonalizationProvider,
  OnWebPushAPIKeyListener,
} from "./interfaces/ISwrveConfig";
import {
  ISwrveMessageButtonDetails,
  ISwrveMessageDetails,
  OnSwrveInAppMessageListener,
  SwrveMessageAction,
} from "./interfaces/ISwrveMessageListener";
import { ResourceManager } from "./Resources/ResourceManager";
import {
  ISwrveCampaign,
  ISwrveEmbeddedMessage,
  ISwrveMessage,
  IUserResource,
  ISwrveAsset,
} from "./interfaces/ISwrveCampaign";
import { IUserInfo } from "./interfaces/IUser";
import IDictionary from "./interfaces/IDictionary";
import IReadonlyDictionary from "./interfaces/IReadonlyDictionary";
import IReward from "./interfaces/IReward";
import IPushEvent from "./interfaces/IPushEvent";
import {
  ISwrvePushInboxMessage,
  ISwrvePushInboxMessageRaw,
  ISwrvePushInboxResult,
  OnPushInboxOperationComplete,
  OnPushInboxUpdated,
  SwrvePushInboxId,
  SwrvePushInboxMessageState,
  SwrvePushInboxResultCode,
} from "./interfaces/IPushInbox";
import { IAsset } from "./interfaces/IAsset";
import { IKeyMapping } from "./interfaces/IKeymapping";
import { generateUuid } from "./utils/uuid";
import { SwrveResource } from "./Resources/SwrveResource";
import SwrveFocusManager, { MenuDirection } from "./Campaigns/Messages/UIElements/SwrveFocusManager";

export {
  SwrveCoreSDK,
  ISwrveConfig,
  ISwrveEmbeddedMessageConfig,
  ISwrveEmbeddedMessage,
  ISwrveInAppMessageConfig,
  ISwrveWebPushConfig,
  IPlatform,
  IPlatformName,
  NetworkListener,
  NetworkMonitorHandle,
  NetworkStatus,
  OnIdentifyErrorCallback,
  OnIdentifySuccessCallback,
  OnSwrveCoreReadyCallback,
  ResourceManager,
  ISwrveCampaign,
  IUserInfo,
  IDictionary,
  IReadonlyDictionary,
  IUserResource,
  SwrveResource,
  ISwrveMessage,
  ISwrveAsset,
  IReward,
  IPushEvent,
  ISwrvePushInboxMessage,
  ISwrvePushInboxMessageRaw,
  ISwrvePushInboxResult,
  OnPushInboxOperationComplete,
  OnPushInboxUpdated,
  SwrvePushInboxId,
  SwrvePushInboxMessageState,
  SwrvePushInboxResultCode,
  IAsset,
  IKeyMapping,
  DevicePropertyName,
  generateUuid,
  OnPersonalizationProvider,
  OnEmbeddedMessageListener,
  OnWebPushAPIKeyListener,
  OnSwrveInAppMessageListener,
  SwrveMessageAction,
  ISwrveMessageDetails,
  ISwrveMessageButtonDetails,
  SwrveFocusManager,
  MenuDirection,
  NETWORK_CONNECTED,
  NETWORK_DISCONNECTED,
};
