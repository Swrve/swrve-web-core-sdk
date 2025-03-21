import { ISwrveButton, ISwrveInAppMessage } from "../../interfaces/ISwrveCampaign";
import { SwrveImage } from "./UIElements/SwrveImage";
import { SwrveButton } from "./UIElements/SwrveButton";
import {
    Animation,
    Position,
  SWRVE_IAM_BUTTON,
  SWRVE_IAM_BUTTON_CLICK_EVENT,
  SWRVE_IAM_CANVAS,
  SWRVE_IAM_ENTER_ANIMATIONS,
  SWRVE_IAM_IMAGE,
  SWRVE_IAM_OVERLAY,
  SWRVE_IAM_POSITIONS,
  SWRVE_IAM_TEMPLATE_LITERAL,
} from "./SwrveInAppConstants";
import HTMLSwrveImageElement from "./HTMLSwrveImageElement";
import HTMLSwrveButtonElement from "./HTMLSwrveButtonElement";
import { ISwrveInAppMessageConfig } from "../../interfaces/ISwrveConfig";


class HTMLSwrveInAppElement extends HTMLElement {
  private _root: ShadowRoot;
  private _overlayElement: HTMLDivElement;
  private _canvasElement: HTMLDivElement;
  private _styles: HTMLStyleElement;
  private _message: ISwrveInAppMessage | undefined;
  private _inAppConfig?: ISwrveInAppMessageConfig;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: "closed" });
    this._root.appendChild(
      document.importNode(HTMLSwrveInAppElement.template().content, true)
    );
    this._overlayElement = this._root.querySelector(`.${SWRVE_IAM_OVERLAY}`)!;
    this._canvasElement = this._root.querySelector(`.${SWRVE_IAM_CANVAS}`)!;
    this._styles = this._root.querySelector("style")!;
  }

  public get animation(): Animation {
    return this.getAttribute("animation") as Animation;
  }

  public get position(): Position {
    return this.getAttribute("position") as Position;
  }

  public get message(): ISwrveInAppMessage | undefined {
    return this._message;
  }

  public set animation(animation: Animation) {
    this.setAttribute("animation", animation.toString());
  }

  public set position(position: Position) {
    this.setAttribute("position", position.toString());
  }

  public set message(message: ISwrveInAppMessage | undefined) {
    this._message = message;
  }

  public set inAppConfig(inAppConfig: ISwrveInAppMessageConfig | undefined) {
    this._inAppConfig = inAppConfig;
  }

  public get inAppConfig(): ISwrveInAppMessageConfig | undefined{
    return this._inAppConfig;
  }

  public connectedCallback() {
    // this._styles.textContent += SWRVE_IAM_ENTER_ANIMATIONS[this.animation].templateLiteral;
    // this._canvasElement.classList.add(SWRVE_IAM_ENTER_ANIMATIONS[this.animation].className);
    this._styles.textContent += SWRVE_IAM_POSITIONS[this.position];
  }

  public show(): void {
    this.renderMessage();
  }

  public close(): void {
    this.removeMessage();
  }

  private handleButtonClick(button: ISwrveButton): void {
    this.dispatchEvent(
      new CustomEvent(SWRVE_IAM_BUTTON_CLICK_EVENT, {
        detail: {
          button: button,
          parentCampaign: this._message?.parentCampaign,
        },
      })
    );

    this.close();
  }

  private renderMessage(): void {
    this._canvasElement.style.width = `${this.message?.canvasWidth || 0}px`;
    this._canvasElement.style.height = `${this.message?.canvasHeight || 0}px`;

    this.appendImages();
    this.appendButtons();

    this._overlayElement.style.display = "flex";


  }

  private removeMessage(): void {
    this._overlayElement.style.display = "none";
    this._canvasElement.style.width = "0px";
    this._canvasElement.style.height = "0px";
    this._canvasElement.innerHTML = "";
    this._message = undefined;
  }

  private appendImages(): void {
    this._message?.images.forEach((image, index): void => {
      const swrveImage = <HTMLSwrveImageElement> document.createElement("swrve-image");
      swrveImage.image = new SwrveImage(image, this._message!.imagesCDN, this._message?.personalizationProperties, this._message!.scale);
      swrveImage.personalizationProperties = this._message!.personalizationProperties!;
      swrveImage.inAppConfig = this.inAppConfig;
      swrveImage.canvasHeight = this.message!.canvasHeight;
      swrveImage.canvasWidth = this.message!.canvasWidth;
      swrveImage.id = `${SWRVE_IAM_IMAGE}-${index}`;
      
      this._canvasElement.appendChild(swrveImage);
    });
  }

  private appendButtons(): void {
    this._message?.buttons.forEach((button, index): void => {
      const swrveButton = <HTMLSwrveButtonElement> document.createElement("swrve-button");
      swrveButton.button = new SwrveButton(button, this._message!.imagesCDN, this._message?.personalizationProperties, this._message!.scale);
      swrveButton.personalizationProperties = this._message!.personalizationProperties!;
      swrveButton.inAppConfig = this.inAppConfig;
      swrveButton.onclick = () => this.handleButtonClick(button);
      swrveButton.canvasHeight = this.message!.canvasHeight;
      swrveButton.canvasWidth = this.message!.canvasWidth;
      swrveButton.id = `${SWRVE_IAM_BUTTON}-${index}`;

      this._canvasElement.appendChild(swrveButton);
    });
  }

  private static template(): HTMLTemplateElement {
    const template = document.createElement("template");
    template.innerHTML = SWRVE_IAM_TEMPLATE_LITERAL;

    return template;
  }
}

export default HTMLSwrveInAppElement;