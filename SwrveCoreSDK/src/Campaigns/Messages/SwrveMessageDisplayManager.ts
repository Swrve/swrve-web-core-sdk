import "@webcomponents/custom-elements/src/native-shim";
import {
  ISwrveButton,
  ISwrveCampaign,
  ISwrveButtonEvent,
  ISwrveButtonPayloadItem,
  ISwrveFormat,
  ISwrveImage,
  ISwrveMessage,
  ISwrvePage,
} from "../../interfaces/ISwrveCampaign";
import { IPlatform } from "../../interfaces/IPlatform";
import { IKeyMapping } from "../../interfaces/IKeymapping";
import IDictionary from "../../interfaces/IDictionary";
import SwrveConfig from "../../Config/SwrveConfig";
import HTMLSwrveInAppElement, {
  ISwrveInAppMessageFormat,
} from "./HTMLSwrveInAppElement";
import { Animation, Position } from "./SwrveInAppConstants";
import HTMLSwrveButtonElement from "./HTMLSwrveButtonElement";
import HTMLSwrveImageElement from "./HTMLSwrveImageElement";
import { ISwrveInAppMessageConfig } from "../../interfaces/ISwrveConfig";
import IGenericCampaignEvent from "../../interfaces/IGenericCampaignEvent";


export interface IButtonClickContext {
  buttonId?: number;
  contextId?: number;
  pageName?: string;
  /** Properties the message was rendered with, used to resolve the action */
  personalizationProperties?: IDictionary<string>;
}

export type OnButtonClicked = (
  button: ISwrveButton,
  message: ISwrveMessage,
  context?: IButtonClickContext
) => void;

export type OnGenericCampaignEvent = (
  event: Omit<IGenericCampaignEvent, "seqnum" | "time" | "type">
) => void;

export type OnDataCaptureEvent = (
  event: ISwrveDataCaptureEvent
) => void;

export interface ISwrveDataCaptureEvent {
  events: ReadonlyArray<ISwrveButtonEvent>;
  user_updates: ReadonlyArray<ISwrveButtonPayloadItem>;
  personalizationProperties?: IDictionary<string>;
}

/**
 * How long the viewport must settle before the format is re-evaluated. Resize
 * fires continuously while a desktop window is dragged, and a format swap
 * re-renders the message, so it must not run per event.
 */
const RESIZE_DEBOUNCE_MS = 150;

export class SwrveMessageDisplayManager {
  private onButtonClickedCallback: OnButtonClicked | null = null;
  private onGenericCampaignEventCallback: OnGenericCampaignEvent | null = null;
  private onDataCaptureEventCallback: OnDataCaptureEvent | null = null;
  private isOpen: boolean = false;
  private justClosed: boolean = false;
  private keymap: IKeyMapping;
  private currentMessage: ISwrveMessage | null = null;
  private currentFormat: ISwrveFormat | null = null;
  private resizeDebounceHandle: ReturnType<typeof setTimeout> | undefined;
  private boundHandleViewportResize = (): void => this.handleViewportResize();
  /* Assigned in the constructor rather than here. A field initializer runs
   * before the constructor body, so the element would be created before
   * `registerSwrveElements` defines it. `createElement` would then return an
   * un-upgraded element, and assignments such as `inAppConfig` would land as
   * own properties that permanently shadow the class accessors once the element
   * is upgraded on insertion, leaving the config invisible to the renderer. */
  private swrveIAM!: HTMLSwrveInAppElement;

  constructor(
    platform: IPlatform,
    config?: SwrveConfig
  ) {

    this.keymap = platform.getKeymapping();
    this.registerSwrveElements();

    this.swrveIAM = <HTMLSwrveInAppElement>(
      document.createElement("swrve-in-app-message")
    );

    if (config) {
      this.initSwrveIAM(Animation.none , Position.center, config.InAppMessageConfig);
    } else {
      this.initSwrveIAM(Animation.none, Position.center);
    }

    this.initButtonClickListener();
    this.initGenericCampaignEventListener();
    this.initDataCaptureEventListener();

    window.addEventListener("resize", this.boundHandleViewportResize);
  }

  public showMessage(
    message: ISwrveMessage,
    parentCampaign: ISwrveCampaign,
    imagesCDN: string,
    personalizationProperties?: IDictionary<string>
  ): void {
    const iam = this.getBestFormat(message);

    if (iam) {
      this.isOpen = true;
      this.currentMessage = message;
      this.currentFormat = iam;

      this.swrveIAM.message = {
        personalizationProperties,
        message,
        imagesCDN,
        parentCampaign,
        ...this.getFormatFields(iam),
      };

      this.swrveIAM.show();
    }
  }

  public onButtonClicked(callback: OnButtonClicked): void {
    this.onButtonClickedCallback = callback;
  }

  public onGenericCampaignEvent(callback: OnGenericCampaignEvent): void {
    this.onGenericCampaignEventCallback = callback;
  }

  public onDataCaptureEvent(callback: OnDataCaptureEvent): void {
    this.onDataCaptureEventCallback = callback;
  }

  public isIAMShowing(): boolean {
    return this.isOpen;
  }

  public closeMessage(): void {
    this.isOpen = false;
    this.justClosed = true;
    this.currentMessage = null;
    this.currentFormat = null;

    if (this.resizeDebounceHandle !== undefined) {
      clearTimeout(this.resizeDebounceHandle);
      this.resizeDebounceHandle = undefined;
    }

    this.swrveIAM.close();
  }

  private handleViewportResize(): void {
    /* The listener lives for the lifetime of the manager, so bail out before
     * scheduling anything when no message is showing. Otherwise every resize
     * while the SDK is idle would queue a timer only to no-op on firing. */
    if (!this.isOpen || !this.currentMessage) {
      return;
    }

    if (this.resizeDebounceHandle !== undefined) {
      clearTimeout(this.resizeDebounceHandle);
    }

    this.resizeDebounceHandle = setTimeout(
      () => this.reselectFormat(),
      RESIZE_DEBOUNCE_MS
    );
  }

  /**
   * Re-evaluates which format best fits the viewport and swaps it in if the
   * choice has changed, so a rotation or window resize moves between the
   * portrait and landscape artwork rather than just rescaling what is showing.
   */
  private reselectFormat(): void {
    this.resizeDebounceHandle = undefined;

    if (!this.isOpen || !this.currentMessage) {
      return;
    }

    const format = this.getBestFormat(this.currentMessage);
    if (!format || format === this.currentFormat) {
      return;
    }

    this.currentFormat = format;
    this.swrveIAM.swapFormat(this.getFormatFields(format));
  }

  private getFormatFields(format: ISwrveFormat): ISwrveInAppMessageFormat {
    return {
      scale: format.scale,
      calibration: format.calibration,
      images: this.getFirstPage(format).images,
      buttons: this.getFirstPage(format).buttons,
      pages: this.getPages(format),
      storySettings: format.story_settings,
      color: format.color,
      ...this.getCanvasDimensions(format),
    };
  }


  private initSwrveIAM(animation: Animation, position: Position, inAppConfig?: ISwrveInAppMessageConfig): void {
    this.swrveIAM.setAttribute("animation", animation);
    this.swrveIAM.setAttribute("position", position);
    this.swrveIAM.inAppConfig = inAppConfig!;

    document.body.appendChild(this.swrveIAM);
  }

  private registerSwrveElements() {
    if (!window.customElements.get("swrve-in-app-message")) {
      window.customElements.define("swrve-in-app-message", HTMLSwrveInAppElement);
    }
    if (!window.customElements.get("swrve-button")) {
      window.customElements.define("swrve-button", HTMLSwrveButtonElement);
    }
    if (!window.customElements.get("swrve-image")) {
      window.customElements.define("swrve-image", HTMLSwrveImageElement);
    }
  }

  private initButtonClickListener(): void {
    this.swrveIAM.addEventListener("swrve-iam-button-click", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      // Ensure that the IAM.isOpen is set to closed if it's not already
      this.closeMessage();

      if (this.onButtonClickedCallback) {
        const detail = (<CustomEvent>event).detail;
        this.onButtonClickedCallback(detail.button, detail.message, {
          buttonId: detail.buttonId,
          contextId: detail.contextId,
          pageName: detail.pageName,
          personalizationProperties: detail.personalizationProperties,
        });
      }
    });
  }

  private initGenericCampaignEventListener(): void {
    this.swrveIAM.addEventListener("swrve-iam-generic-campaign-event", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (this.onGenericCampaignEventCallback) {
        this.onGenericCampaignEventCallback((<CustomEvent>event).detail);
      }
    });
  }

  private initDataCaptureEventListener(): void {
    this.swrveIAM.addEventListener("swrve-iam-data-capture-event", (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();

      if (this.onDataCaptureEventCallback) {
        this.onDataCaptureEventCallback((<CustomEvent>event).detail);
      }
    });
  }


  private getBestFormat(message: ISwrveMessage): ISwrveFormat | null {
    const formats = message.template.formats || null;
    if (!formats) return null;

    const currentOrientation = this.getCurrentOrientation();
    const matchingFormat = formats.find(
      (format) => format.orientation === currentOrientation
    );

    if (matchingFormat) {
      return matchingFormat;
    }

    const landscape = formats.find((format) => format.orientation === "landscape");

    return landscape || formats[0] || null;
  }

  private getCurrentOrientation(): "landscape" | "portrait" {
    if (typeof window !== "undefined") {
      const width = window.innerWidth || document.documentElement.clientWidth;
      const height = window.innerHeight || document.documentElement.clientHeight;

      if (width > 0 && height > 0) {
        return width >= height ? "landscape" : "portrait";
      }
    }

    return "landscape";
  }

  private getPages(format: ISwrveFormat): ReadonlyArray<ISwrvePage> {
    if (format.pages && format.pages.length > 0) {
      return format.pages;
    }

    return [
      {
        page_id: 0,
        images: format.images || [],
        buttons: format.buttons || [],
      }
    ];
  }

  private getFirstPage(format: ISwrveFormat): ISwrvePage {
    return this.getPages(format)[0];
  }

  // FIXME: this is empty on tests
  private getCanvasDimensions(format: ISwrveFormat) {
    const width = Number(format.size && format.size.w && format.size.w.value);
    const height = Number(format.size && format.size.h && format.size.h.value);
    if (width > 0 && height > 0) {
      return {
        canvasWidth: width,
        canvasHeight: height,
      };
    }

    const firstPage = this.getFirstPage(format);
    const images = firstPage.images || [];
    const buttons = firstPage.buttons || [];
    let background;
    if (images.length != 0) {
      background = images.find(
        (img) => img.name === "Background"
      ) as ISwrveImage;
    } else {
      background = buttons.find(
        (btn) => btn.name === "Background"
      ) as ISwrveButton;
    }

    if (background){
      return {
        canvasWidth: background.dynamic_image_url
          ? <number>background.w.value
          : background.image_width,
        canvasHeight: background.dynamic_image_url
          ? <number>background.h.value
          : background.image_height,
      };
    } else {
      return {
        canvasWidth: 100,
        canvasHeight: 100
      }
    }

  }
}
