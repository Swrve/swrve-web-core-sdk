import "@webcomponents/custom-elements/src/native-shim";
import {
  ISwrveButton,
  ISwrveCampaign,
  ISwrveFormat,
  ISwrveImage,
  ISwrveMessage,
} from "../../interfaces/ISwrveCampaign";
import { IPlatform } from "../../interfaces/IPlatform";
import { IKeyMapping } from "../../interfaces/IKeymapping";
import IDictionary from "../../interfaces/IDictionary";
import SwrveConfig from "../../Config/SwrveConfig";
import HTMLSwrveInAppElement from "./HTMLSwrveInAppElement";
import { Animation, Position } from "./SwrveInAppConstants";
import HTMLSwrveButtonElement from "./HTMLSwrveButtonElement";
import HTMLSwrveImageElement from "./HTMLSwrveImageElement";
import { ISwrveInAppMessageConfig } from "../../interfaces/ISwrveConfig";


export type OnButtonClicked = (
  button: ISwrveButton,
  message: ISwrveMessage
) => void;

interface IAMButton {
  button: ISwrveButton;
  message: ISwrveMessage;
  element: HTMLElement;
}

export class SwrveMessageDisplayManager {
  private onButtonClickedCallback: OnButtonClicked | null = null;
  private isOpen: boolean = false;
  private justClosed: boolean = false;
  private keymap: IKeyMapping;
  private swrveIAM: HTMLSwrveInAppElement = <HTMLSwrveInAppElement>(
    document.createElement("swrve-in-app-message")
  );

  constructor(
    platform: IPlatform,
    config?: SwrveConfig
  ) {

    this.keymap = platform.getKeymapping();
    this.registerSwrveElements();

    if (config) {
      this.initSwrveIAM(Animation.none , Position.center, config.InAppMessageConfig);
    } else {
      this.initSwrveIAM(Animation.none, Position.center);
    }

    this.initButtonClickListener();
  }

  public showMessage(
    message: ISwrveMessage,
    parentCampaign: ISwrveCampaign,
    imagesCDN: string,
    personalizationProperties?: IDictionary<string>
  ): void {
    const iam = this.getLandscapeFormat(message);

    if (iam) {
      this.isOpen = true;

      this.swrveIAM.message = {
        personalizationProperties,
        imagesCDN,
        parentCampaign,
        scale: iam.scale,
        images: iam.images,
        buttons: iam.buttons,
        ...this.getCanvasDimensions(iam),
      };

      this.swrveIAM.show();
    }
  }

  public onButtonClicked(callback: OnButtonClicked): void {
    this.onButtonClickedCallback = callback;
  }

  public isIAMShowing(): boolean {
    return this.isOpen;
  }

  public closeMessage(): void {
    this.isOpen = false;
    this.justClosed = true;
    this.swrveIAM.close();
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
        this.onButtonClickedCallback(
          (<CustomEvent>event).detail.button,
          (<CustomEvent>event).detail.parentCampaign
        );
      }
    });
  }


  private getLandscapeFormat(message: ISwrveMessage): ISwrveFormat | null {
    const formats = message.template.formats || null;
    if (!formats) return null;

    let landscape: ISwrveFormat | null = null;

    formats.forEach((format) => {
      if (format.orientation === "landscape") {
        landscape = format;
      }
    });

    return landscape;
  }

  // FIXME: this is empty on tests
  private getCanvasDimensions(format: ISwrveFormat) {
    let background;
    if (format.images.length != 0) {
      background = format.images.find(
        (img) => img.name === "Background"
      ) as ISwrveImage;
    } else {
      background = format.buttons.find(
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
