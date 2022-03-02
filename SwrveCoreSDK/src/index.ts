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
import { ResourceManager } from "./Resources/ResourceManager";
import {
  ISwrveCampaign,
  ISwrveEmbeddedMessage,
  ISwrveMessage,
  IUserResource,
} from "./interfaces/ISwrveCampaign";
import { IUserInfo } from "./interfaces/IUser";
import IDictionary from "./interfaces/IDictionary";
import IReadonlyDictionary from "./interfaces/IReadonlyDictionary";
import IReward from "./interfaces/IReward";
import { IAsset } from "./interfaces/IAsset";
import { IKeyMapping } from "./interfaces/IKeymapping";
import { generateUuid } from "./utils/uuid";
import { SwrveResource } from "./Resources/SwrveResource";
import SwrveFocusManager, { MenuDirection } from "./UIElements/SwrveFocusManager";

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
  IReward,
  IAsset,
  IKeyMapping,
  DevicePropertyName,
  generateUuid,
  OnPersonalizationProvider,
  OnEmbeddedMessageListener,
  OnWebPushAPIKeyListener,
  SwrveFocusManager,
  MenuDirection,
  NETWORK_CONNECTED,
  NETWORK_DISCONNECTED,
};
