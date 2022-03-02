import {
  ISwrveButton,
  ISwrveCampaign,
  ISwrveFormat,
  ISwrveImage,
  ISwrveMessage,
} from "../../interfaces/ISwrveCampaign";
import { IPlatform } from "../../interfaces/IPlatform";
import { SWRVE_IAM_CONTAINER, SWRVE_OVERLAY_CONTAINER } from "../../utils/SwrveConstants";
import SwrveFocusManager from "../../UIElements/SwrveFocusManager";
import { IKeyMapping } from "../../interfaces/IKeymapping";
import IDictionary from "../../interfaces/IDictionary";
import { ResourceManager } from "../../Resources/ResourceManager";
import { ICSSStyle } from "../../interfaces/ISwrveConfig";
import SwrveLogger from "../../utils/SwrveLogger";
import SwrveConfig from "../../Config/SwrveConfig";

export type OnButtonClicked = (
  button: ISwrveButton,
  message: ISwrveMessage
) => void;

interface IAMButton {
  button: ISwrveButton;
  message: ISwrveMessage;
  element: HTMLElement;
}

const blacklistedCSSAttributes = [
  /* strip out attributes used for positioning */
  "position",
  "width",
  "height",
  "top",
  "left",
  /* strip out extra attributes from resources */
  "uid",
  "name",
  "description",
  "thumbnail",
  "item_class",
].reduce((idx, prop) => {
  idx[prop] = true;
  return idx;
}, {} as IDictionary<boolean>);

const defaultStyle = {
  opacity: "0.5",
  transition: "opacity 150ms ease-out",
};

const defaultFocusStyle = {
  opacity: "1",
  transition: "opacity 150ms ease-out",
};

const overlayStyle = {
  backgroundColor: 'black',
  left: '0',
  opacity: '1',
  position: 'absolute',
  top: '0',
  width: '100%'
};

export class SwrveMessageDisplayManager {
  private screenCenterWidth: number = 0;
  private screenCenterHeight: number = 0;
  private onButtonClickedCallback: OnButtonClicked | null = null;
  private isOpen: boolean = false;
  private justClosed: boolean = false;
  private focusManager?: SwrveFocusManager<IAMButton>;
  private resourceManager?: ResourceManager;
  private normalStyle?: ICSSStyle | string;
  private focusStyle?: ICSSStyle | string;
  private keymap: IKeyMapping;

  constructor(
    platform: IPlatform,
    config?: SwrveConfig,
    resourceManager?: ResourceManager
  ) {
    this.normalStyle = config && config.InAppMessageConfig && config.InAppMessageConfig.defaultButtonStyle;
    this.focusStyle = config && config.InAppMessageConfig && config.InAppMessageConfig.defaultButtonFocusStyle;

    this.keymap = platform.getKeymapping();
    this.resourceManager = resourceManager;
    this.initListener();
  }

  public showMessage(
    message: ISwrveMessage,
    parentCampaign: ISwrveCampaign,
    imagesCDN: string,
    platform: IPlatform
  ): void {
    this.screenCenterWidth = platform.screenWidth / 2;
    this.screenCenterHeight = platform.screenHeight / 2;

    const iam = this.getLandscapeFormat(message);
    if (iam) {
      this.isOpen = true;
      this.createContainer(message.name, iam.color || undefined);
      this.appendImages(iam.images, imagesCDN, iam.scale);

      message.parentCampaign = parentCampaign.id;
      
      const buttons = this.appendButtons(
        iam.buttons,
        message,
        imagesCDN,
        iam.scale
      );
      this.focusManager = this.createFocusManager(buttons);
      this.focusManager.setActiveFirst();
    }
  }

  public onButtonClicked(callback: OnButtonClicked): void {
    this.onButtonClickedCallback = callback;
  }

  public isIAMShowing(): boolean {
    return this.isOpen;
  }

  public closeMessage(): void {
    //TODO: this was previously SWRVE_IAM_CONTAINER
    const container = document.getElementById(SWRVE_OVERLAY_CONTAINER);
    if (container) {
      document.body.removeChild(container);
    }

    this.isOpen = false;
    this.justClosed = true;
    delete this.focusManager;
  }

  private onKeydown = (ev: KeyboardEvent) => {
    if (!this.isOpen) {
      return;
    }

    ev.preventDefault();
    ev.stopImmediatePropagation();

    const key = this.keymap[ev.keyCode];
    if (key === "Back") {
      this.closeMessage();
    } else if (key && this.focusManager) {
      this.focusManager.onKeyPress(key);
    }
  };

  private onKeyup = (ev: KeyboardEvent) => {
    /* Closing the message will fire up one last "keyup" event */
    /* This prevents that keyup event from spreading down to the app */
    if (this.justClosed) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      this.justClosed = false;
      return;
    }
  };

  private initListener(): void {
    window.addEventListener("keydown", this.onKeydown, true);
    window.addEventListener("keyup", this.onKeyup, true);
  }

  private getLandscapeFormat(message: ISwrveMessage): ISwrveFormat | null {
    const formats = message.template.formats || null;

    if (formats) {
      let landscape: ISwrveFormat | null = null;

      formats.forEach((format) => {
        if (format.orientation === "landscape") {
          landscape = format;
        }
      });

      return landscape;
    } else {
      return null;
    }
  }

  private createContainer(name: string, color?: string): void {
    //TODO: iamOverlay was added to accommodate web.
    const docHeight = this.getDocumentHeight();
    const iamOverlay = document.createElement('div');

    this.applyElementStyle(iamOverlay, overlayStyle);
    iamOverlay.style.height = `${docHeight}`;
    iamOverlay.id = SWRVE_OVERLAY_CONTAINER;
    /* iamOverlay.onclick = () => this.handleOverlayClick(); */ /* Added this to dismiss if you click away from items */

    const iamContainer = document.createElement("div");

    iamContainer.id = SWRVE_IAM_CONTAINER;
    iamContainer.className = name;
    iamContainer.style.position = "absolute";
    iamContainer.style.zIndex = "2147483647";
    iamContainer.style.backgroundColor = color || "";

    //TODO added the overlay:
    iamOverlay.appendChild(iamContainer);

    //TODO this was previously iamContainer
    document.body.appendChild(iamOverlay);
  }

  private createFocusManager(
    buttons: ReadonlyArray<IAMButton>
  ): SwrveFocusManager<IAMButton> {
    return new SwrveFocusManager<IAMButton>(buttons, {
      direction: "bidirectional",
      onFocus: (btn) =>
        this.applyElementStyle(
          btn.element,
          this.getFocusStyle(this.focusStyle, defaultFocusStyle)
        ),
      onBlur: (btn) =>
        this.applyElementStyle(
          btn.element,
          this.getFocusStyle(this.normalStyle, defaultStyle)
        ),
      onKeyPress: ({ button, message }, key): boolean => {
        if (key === "Enter") {
          this.handleButton(button, message);
          return true;
        }
        return false;
      },
    });
  }

  private applyElementStyle(el: HTMLElement, style: ICSSStyle): void {
    for (const attr in style) {
      if (style.hasOwnProperty(attr)) {
        el.style[<any>attr] = style[attr];
      }
    }
  }

  private getFocusStyle(
    style: ICSSStyle | string | undefined,
    defaults: ICSSStyle
  ): ICSSStyle {
    let ret = defaults;
    if (typeof style === "string") {
      if (this.resourceManager) {
        const resource = this.resourceManager.getResource(style).toJSON();
        if (Object.keys(resource).length !== 0) {
          ret = this.sanitizeFocusStyle(resource);
        }
      }
    } else if (style) {
      ret = this.sanitizeFocusStyle(style);
    }
    return ret;
  }

  private sanitizeFocusStyle(style: ICSSStyle): ICSSStyle {
    const ret: ICSSStyle = {};
    for (const key in style) {
      if (style.hasOwnProperty(key) && !blacklistedCSSAttributes[key]) {
        ret[key] = style[key];
      }
    }
    return ret;
  }

  private appendImages(
    images: ReadonlyArray<ISwrveImage>,
    cdn: string,
    scale: number
  ): void {
    images.forEach((image, index) => {
      const imageElement = document.createElement("img");

      imageElement.id = "SwrveImage" + index;
      imageElement.src = (cdn + image.image.value) as string;

      this.addElement(image, imageElement, scale);
    });
  }

  private appendButtons(
    buttons: ReadonlyArray<ISwrveButton>,
    message: ISwrveMessage,
    cdn: string,
    scale: number
  ): IAMButton[] {
    return buttons.map((button, index) => {
      const buttonElement = document.createElement("img");
      const buttonStyle = this.getFocusStyle(this.normalStyle, defaultStyle);

      buttonElement.id = "SwrveButton" + index;
      buttonElement.src = (cdn + button.image_up.value) as string;
      buttonElement.style.border = "0px";
      buttonElement.onclick = () => this.handleButton(button, message);

      /* TODO: add this to the platform config or even the global config that comes down */
      buttonElement.onmouseover = () => {
        this.applyElementStyle(
          buttonElement,
          this.getFocusStyle(this.focusStyle, defaultFocusStyle)
        )
      };
      buttonElement.onmouseleave = () => {
        this.applyElementStyle(
          buttonElement,
          this.getFocusStyle(this.normalStyle, defaultStyle)
        )
      };

      this.applyElementStyle(buttonElement, buttonStyle);
      this.addElement(button, buttonElement, scale);

      return {
        button,
        message: message,
        element: buttonElement,
      };
    });
  }

  private addElement(
    swrveItem: ISwrveButton | ISwrveImage,
    element: HTMLImageElement,
    scale: number
  ): void {
    if (
      typeof swrveItem.x.value === "number" &&
      typeof swrveItem.y.value === "number"
    ) {
      const container = document.getElementById(SWRVE_IAM_CONTAINER);
      const width = element.naturalWidth * scale;
      const height = element.naturalHeight * scale;
      const yPos = swrveItem.y.value;
      const xPos = swrveItem.x.value;

      if (width > height) {
        element.style.width = width.toString() + "px";
      } else {
        element.style.height = height.toString() + "px";
      }

      element.style.position = "absolute";
      element.style.top =
        (yPos + (this.screenCenterHeight - height / 2)).toString() + "px";
      element.style.left =
        (xPos + (this.screenCenterWidth - width / 2)).toString() + "px";

      container!.appendChild(element);
    }
  }

  private handleButton(
    button: ISwrveButton,
    message: ISwrveMessage
  ): void {
    this.closeMessage();
    if (this.onButtonClickedCallback) {
      this.onButtonClickedCallback(button, message);
    }
  }

  private getDocumentHeight() {
    const body = document.body;
    const html = document.documentElement;
    return Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight);
  }

  private getDocumentWidth() {
    const body = document.body;
    const html = document.documentElement;
    return Math.max(body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth);
  }
}
