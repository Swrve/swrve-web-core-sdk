import {
  DevicePropertyName,
  IPlatform,
  IPlatformName,
  NetworkListener,
  NetworkMonitorHandle,
  NetworkStatus,
  NETWORK_CONNECTED,
  NETWORK_DISCONNECTED,
} from "../../src/interfaces/IPlatform";
import { IKeyMapping } from "../../src/interfaces/IKeymapping";
import SwrveLogger from "../../src/utils/SwrveLogger";
import { IAsset } from "../../src/interfaces/IAsset";
import {
  SWRVE_DEVICE_ID,
  SWRVE_APP_STORE,
  SWRVE_COUNTRY_CODE,
  SWRVE_DEVICE_NAME,
  SWRVE_DEVICE_REGION,
  SWRVE_DEVICE_TYPE,
  SWRVE_LANGUAGE,
  SWRVE_OS,
  SWRVE_OS_VERSION,
  SWRVE_SDK_VERSION,
  SWRVE_TIMEZONE_NAME,
  SWRVE_UTC_OFFSET_SECONDS,
} from "../../src/utils/SwrveConstants";

const defaultMapping: IKeyMapping = {
  36: "Return",
  38: "Up",
  40: "Down",
  37: "Left",
  39: "Right",
  13: "Enter",
  65: "A",
  66: "B",
  67: "C",
  68: "D",
  8: "Back",
  179: "Play",
  227: "FastForward",
  228: "Rewind",
  112: "F1",
};

const protectedKeyPrefix = /^swrve\./;
export function clearLocalStorage(force: boolean = false): void {
  const keys = [];
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (key && force) {
      keys.push(key);
    } else if (key && !protectedKeyPrefix.test(key)) {
      keys.push(key);
    }
  }
  keys.forEach((key) => localStorage.removeItem(key!));
}

if (
  typeof window !== "undefined" &&
  window.localStorage &&
  window.localStorage.clear !== clearLocalStorage
) {
  window.localStorage.clear = clearLocalStorage;
}

/**
 * Base Platform (also the browser platform)
 */
export default class PlatformMock implements IPlatform {
  /** True if the platform needs a proxy. */
  protected needsProxy: boolean = true;

  /** True if this platform supports the magic wand. */
  protected supportsMagicWandNatively: boolean = false;

  /** Number of history entries on start. */
  protected startHistoryLength: number = 0;

  protected _firmware: string | undefined;
  protected _deviceName: string | undefined;
  protected _deviceID: string | undefined;
  protected _deviceType: string | undefined;
  protected _model: string | undefined;
  protected _os: string | undefined;
  protected _osVersion: string | undefined;
  protected _language: string | undefined;
  protected _countryCode: string | undefined;
  protected _screenDPI: number | undefined;
  protected _screenHeight: number | undefined;
  protected _screenWidth: number | undefined;
  protected _timezone: string | undefined;
  protected _region: string | undefined;
  protected networkMonitorHandle?: NetworkMonitorHandle;
  protected networkListeners: NetworkListener[] = [];

  public name(): IPlatformName {
    return {
      name: "Browser",
      variation: "Base",
    };
  }

  public init(
    deviceProperties: ReadonlyArray<DevicePropertyName>
  ): Promise<void> {
    if (typeof window !== "undefined") {
      this.startHistoryLength = window.history.length;
    }

    if (typeof document !== "undefined") {
      const cache = document.createElement("div");
      cache.id = "PALImageCache";
      cache.style.overflow = "hidden";
      cache.style.position = "absolute";
      cache.style.left = "-10000px";
      cache.style.width = "1px";
      cache.style.height = "1px";

      if (document.getElementById("PALImageCache") === null) {
        document.body.appendChild(cache);
      }
    }

    return Promise.resolve();
  }

  public monitorNetwork(networkListener: NetworkListener): NetworkListener {
    if (this.networkMonitorHandle === undefined) {
      this.networkMonitorHandle = this.initNetworkListener();
    }
    this.networkListeners.push(networkListener);
    return networkListener;
  }

  public stopMonitoringNetwork(networkListener: NetworkListener): void {
    this.networkListeners = this.networkListeners.filter(
      (listener) => listener !== networkListener
    );
    if (
      this.networkListeners.length === 0 &&
      this.networkMonitorHandle !== undefined
    ) {
      this.removeNetworkListener(this.networkMonitorHandle);
      delete this.networkMonitorHandle;
    }
  }

  public getNeedsProxy(): boolean {
    return this.needsProxy;
  }

  public getSupportsMagicWandNatively(): boolean {
    return this.supportsMagicWandNatively;
  }

  public disableScreenSaver(): void {
    SwrveLogger.error("platform does not know how to disable screensaver");
  }

  public openLink(link: string): void {
    if (typeof window !== "undefined") {
      window.open(link);
    }
  }

  public enableScreenSaver(): void {
    SwrveLogger.error("platform does not know how to enable screensaver");
  }

  public get synchronousStorage(): Storage {
    if (typeof window !== "undefined") {
      return window.localStorage;
    }
    return globalThis.localStorage;
  }

  public downloadAssets(assets: ReadonlyArray<IAsset>): Promise<void> {
    /* This doesn't need to do anything since it's for a test platform. */
    const downloading = assets.map((asset) => {
      return new Promise<void>((resolve, reject) => {
          resolve();
      });
    });

    return Promise.all(downloading).then(() => void 0);
  }

  public exit(): void {
    const backlength = window.history.length - this.startHistoryLength - 1;
    window.history.go(-backlength);
  }

  public get deviceID(): string {
    return "TEST-DEVICE-ID";
  }

  public get deviceName(): string {
    return `${this.name().variation} ${this.model}`;
  }

  public get deviceType(): string {
    return "TEST-DEVICE-TYPE";
  }

  public get firmware(): string {
    return "Not Supported";
  }

  public get timezone(): string {
    if (this._timezone === undefined) {
      this._timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }
    return this._timezone || "";
  }

  public get region(): string {
    if (this._region === undefined) {
      this._region =
        this.timezone.indexOf("/") !== -1 ? this.timezone.split("/")[0] : "";
    }
    return this._region || "";
  }

  public getDeviceProperties(): any {
    return {
      [SWRVE_DEVICE_ID]: this.deviceID,
      [SWRVE_DEVICE_NAME]: this.deviceName,
      [SWRVE_OS]: this.os,
      [SWRVE_OS_VERSION]: this.osVersion,
      [SWRVE_SDK_VERSION]: "test 1.0.0",
      [SWRVE_LANGUAGE]: this.language,
      [SWRVE_COUNTRY_CODE]: this.countryCode,
      [SWRVE_DEVICE_REGION]: this.region,
      [SWRVE_TIMEZONE_NAME]: this.timezone,
      [SWRVE_UTC_OFFSET_SECONDS]: 0,
      [SWRVE_APP_STORE]: "google",
      [SWRVE_DEVICE_TYPE]: this.deviceType,
    };
  }

  public get model(): string {
    return "";
  }

  public get os(): string {
    return navigator.platform;
  }

  public get osVersion(): string {
    const match = navigator.userAgent.match(/[^\s]+$/);
    return match ? match[0] : "Unknown version";
  }

  public get appStore(): string {
    return "google";
  }

  public get language(): string {
    if (this._language === undefined && typeof navigator !== "undefined") {
      this._language = navigator.language.split("-")[0];
    }
    return this._language || "";
  }

  public get countryCode(): string {
    if (this._countryCode === undefined && typeof navigator !== "undefined") {
      this._countryCode = navigator.language.split("-")[1];
    }
    return this._countryCode || "";
  }

  public get screenDPI(): number {
    if (this._screenDPI === undefined) {
      this._screenDPI = calculatePPI(
        this.screenWidth,
        this.screenHeight,
        detectScreenDiagonal(this.model)
      );
    }

    return this._screenDPI;
  }

  public get screenHeight(): number {
    return 100;
  }

  public get screenWidth(): number {
    return 100;
  }

  public supportsHDR(): boolean {
    return false;
  }

  public getKeymapping(): IKeyMapping {
    return defaultMapping;
  }

  protected triggerNetworkChange(status: NetworkStatus): void {
    this.networkListeners.forEach((listener) => listener(status));
  }

  protected initNetworkListener(): NetworkMonitorHandle {
    const onOnline = () => this.triggerNetworkChange(NETWORK_CONNECTED);
    const onOffline = () => this.triggerNetworkChange(NETWORK_DISCONNECTED);
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return [onOnline, onOffline];
  }

  protected removeNetworkListener(handle: NetworkMonitorHandle): void {
    const [onOnline, onOffline] = <[() => void, () => void]>handle;
    window.removeEventListener("offline", onOffline);
    window.removeEventListener("online", onOnline);
  }
}

/* First numeric part of Samsung and LG model names indicates screen size in inches */
export function detectScreenDiagonal(modelName: string): number {
  let size;
  const match = modelName.match(/\d+/);
  if (match) {
    size = parseInt(match[0], 10);
  }

  /* fallback to median screen size on the market */
  return size || 50;
}

export function calculatePPI(
  pixelWidth: number,
  pixelHeight: number,
  inchDiagonal: number
): number {
  const pixelDiagonal = Math.sqrt(
    pixelWidth * pixelWidth + pixelHeight * pixelHeight
  );
  return Math.round(pixelDiagonal / inchDiagonal);
}
