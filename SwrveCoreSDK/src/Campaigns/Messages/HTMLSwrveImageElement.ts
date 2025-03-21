import IDictionary from "../../interfaces/IDictionary";
import { SwrveImage } from "./UIElements/SwrveImage";
import { TextTemplating } from "../../utils/TextTemplating";
import { getSingleLineTextFittedFontSize } from "../../utils/TextSizeHelper";
import SwrveLogger from "../../utils/SwrveLogger";
import {
  DEFAULT_IAM_TEXT_BACKGROUND_COLOR,
  DEFAULT_IAM_TEXT_FONT,
  DEFAULT_IAM_TEXT_FOREGROUND_COLOR,
} from "./SwrveInAppConstants";
import { ISwrveInAppMessageConfig } from "../../interfaces/ISwrveConfig";

class HTMLSwrveImageElement extends HTMLElement {
  private _root: ShadowRoot;
  private _image!: SwrveImage;
  private _canvasWidth!: number;
  private _canvasHeight!: number;
  private _personalizationProperties?: IDictionary<string>;
  private _inAppConfig?: ISwrveInAppMessageConfig;

  constructor() {
    super();
    this._root = this.attachShadow({ mode: "closed" });
  }

  public set image(image: SwrveImage) {
    this._image = image;
  }

  public get canvasWidth(): number {
    return this._canvasWidth;
  }

  public set canvasWidth(canvasWidth: number) {
    this._canvasWidth = canvasWidth;
  }

  public get canvasHeight(): number {
    return this._canvasHeight;
  }

  public set canvasHeight(canvasHeight: number) {
    this._canvasHeight = canvasHeight;
  }

  public get textForegroundColor(): string {
    let foregroundColor = DEFAULT_IAM_TEXT_FOREGROUND_COLOR;

    if (this._inAppConfig && this._inAppConfig.defaultTextForegroundColor) {
      foregroundColor = this._inAppConfig.defaultTextForegroundColor!;
    }

    return foregroundColor;
  }

  public get textBackgroundColor(): string {
    let foregroundColor = DEFAULT_IAM_TEXT_BACKGROUND_COLOR;

    if (this._inAppConfig && this._inAppConfig.defaultTextBackgroundColor) {
      foregroundColor = this._inAppConfig.defaultTextBackgroundColor!;
    }

    return foregroundColor;
  }

  public get textFontStyle(): string {
    let fontStyle = DEFAULT_IAM_TEXT_FONT;

    if (this._inAppConfig && this._inAppConfig.defaultTextFontStyle) {
      fontStyle = this._inAppConfig.defaultTextFontStyle;
    }

    return fontStyle;
  }

  public set personalizationProperties(
    personalizationProperties: IDictionary<string>
  ) {
    this._personalizationProperties = personalizationProperties;
  }

  public set inAppConfig(inAppConfig: ISwrveInAppMessageConfig | undefined) {
    this._inAppConfig = inAppConfig;
  }

  connectedCallback(): void {
    if (this._image.isSingleLineText) {
      this.appendText();
    } else {
      this.appendImage();
    }
  }

  private appendImage(): void {
    const style = document.createElement("style") as HTMLStyleElement;
    const image = document.createElement("img") as HTMLImageElement;
    style.textContent += `
      img {
        width: ${this._image.getWidth()}px;
        height: ${this._image.getHeight()}px;
        top: ${this.absoluteTopPosition()}px;
        left: ${this.absoluteLeftPosition()}px;
      }
    `;
    image.src = this._image.getAssetPath();
    this._root.appendChild(style);
    this._root.appendChild(image);
  }

  // TODO: https://emailabove.jira.com/browse/MOBILE-30362
  // private appendDynamicUrlImage(): void {
  //   const style = document.createElement("style") as HTMLStyleElement;
  //   const image = document.createElement("div") as HTMLImageElement;
  //   style.textContent += `
  //     .image {
  //       width: ${this._image.getWidth()}px;
  //       height: ${this._image.getHeight()}px;
  //       top: ${this.absoluteTopPosition()}px;
  //       left: ${this.absoluteLeftPosition()}px;
  //       background-size: contain;
  //       background-position: 50% 50%;
  //       background-repeat: no-repeat;
  //       background-size: contain;
  //       background-image: url("${this._image.getAssetPath()}");
  //       background-color: transparent;
  //     }
  //   `;
  //   image.className = "image"
  //   this._root.appendChild(style);
  //   this._root.appendChild(image);
  // }

  private appendText(): void {
    const text = this.resolvePersonalizedText(
      <string>this._image.image.text!.value
    );

    if (text === null) return;

    const style = document.createElement("style") as HTMLStyleElement;
    const image = document.createElement("div") as HTMLDivElement;
    image.className = "text";

    style.textContent += `
      .text {
        width: ${this._image.getWidth()}px;
        height: ${this._image.getHeight()}px;
        top: ${this.absoluteTopPosition()}px;
        left: ${this.absoluteLeftPosition()}px;
        font-size: ${getSingleLineTextFittedFontSize(
          this._image.getWidth(),
          this._image.getHeight(),
          text,
          this.textFontStyle
        )}px;
        background-color: ${this.textBackgroundColor};
        color: ${this.textForegroundColor};
        font-family: ${this.textFontStyle};
        position: absolute;
        overflow: hidden; 
        white-space: nowrap; 
        display: flex; 
        justify-content: center; 
        align-items: center;
        padding: 0;
        border: none;
      }
    `;

    image.innerText = text;
    this._root.appendChild(style);
    this._root.appendChild(image);
  }

  private absoluteTopPosition() {
    return (
      <number>this._image.image.y.value +
      (this.canvasHeight / 2 - this._image.getHeight() / 2)
    );
  }

  private absoluteLeftPosition() {
    return (
      <number>this._image.image.x.value +
      (this.canvasWidth / 2 - <number>this._image.getWidth() / 2)
    );
  }

  private resolvePersonalizedText(text: string) {
    try {
      const resolvedText = TextTemplating.applyTextTemplatingToString(
        text,
        this._personalizationProperties
      );
      return resolvedText;
    } catch (e) {
      SwrveLogger.error("personalization could not be resolved for: " + text);
      return null;
    }
  }
}

export default HTMLSwrveImageElement;
