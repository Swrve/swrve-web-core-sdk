import IDictionary from "../../interfaces/IDictionary";
import { SwrveButton } from "./UIElements/SwrveButton";
import { TextTemplating } from "../../utils/TextTemplating";
import { DEFAULT_IAM_TEXT_BACKGROUND_COLOR, DEFAULT_IAM_TEXT_FONT, DEFAULT_IAM_TEXT_FOREGROUND_COLOR, SWRVE_IAM_BUTTON_TEMPLATE_LITERAL } from "./SwrveInAppConstants";
import { getSingleLineTextFittedFontSize } from "../../utils/TextSizeHelper";
import { ISwrveInAppMessageConfig } from "../../interfaces/ISwrveConfig";

class HTMLSwrveButtonElement extends HTMLElement {
  private _root: ShadowRoot;
  private _$styles: HTMLStyleElement;
  private _$button: HTMLButtonElement;
  private _button!: SwrveButton;
  private _canvasWidth!: number;
  private _canvasHeight!: number;
  private _personalizationProperties?: IDictionary<string>;
  private _inAppConfig?: ISwrveInAppMessageConfig

  constructor() {
    super();
    this._root = this.attachShadow({ mode: "closed" });
    this._root.appendChild(
      document.importNode(HTMLSwrveButtonElement.template().content, true)
    );
    this._$styles = this._root.querySelector("style")!;
    this._$button = this._root.querySelector("button")!;
  }

  public set button(button: SwrveButton) {
    this._button = button;
  }

  public set personalizationProperties(
    personalizationProperties: IDictionary<string>
  ) {
    this._personalizationProperties = personalizationProperties;
  }

  public get canvasWidth(): number {
    return this._canvasWidth;
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

  public set canvasWidth(canvasWidth: number) {
    this._canvasWidth = canvasWidth;
  }

  public get canvasHeight(): number {
    return this._canvasHeight;
  }

  public set canvasHeight(canvasHeight: number) {
    this._canvasHeight = canvasHeight;
  }

  public set inAppConfig(inAppConfig: ISwrveInAppMessageConfig | undefined) {
    this._inAppConfig = inAppConfig;
  }

  connectedCallback(): void {
    if (this._button.isSingleLineText) {
      this.appendTextButton();
    } else {
      this.appendImageButton();
    }
  }

  private appendTextButton(): void {
    const text = this.resolvePersonalizedText(
      <string>this._button.button.text!.value
    );

    this._$button.ariaLabel = text;
    this._$button.textContent = text;
    this._$styles.textContent += `
      button {
        background-color: #FFFFFF;
        width: ${this._button.getWidth()}px;
        height: ${this._button.getHeight()}px;
        top: ${this.absoluteTopPosition()}px;
        left: ${this.absoluteLeftPosition()}px;
        font-size: ${getSingleLineTextFittedFontSize(this._button.getWidth(), this._button.getHeight(), text, this.textFontStyle)}px;
        background-color: ${this.textBackgroundColor};
        color: ${this.textForegroundColor};
        font-family: ${this.textFontStyle};
      }
    `;
  }

  private appendImageButton(): void {
    this._$styles.textContent += `
      button {
        background-image: url(${this._button.getAssetPath()});
        background-size: cover;
        width: ${this._button.getWidth()}px;
        height: ${this._button.getHeight()}px;
        top: ${this.absoluteTopPosition()}px;
        left: ${this.absoluteLeftPosition()}px;
      }
    `;
  }

  private absoluteTopPosition() {
    return (
      <number>this._button.button.y.value +
      (this.canvasHeight / 2 - this._button.getHeight() / 2)
    );
  }

  private absoluteLeftPosition() {
    return (
      <number>this._button.button.x.value +
      (this.canvasWidth / 2 - this._button.getWidth() / 2)
    );
  }

  private resolvePersonalizedText(text: string) {
    const resolvedText = TextTemplating.applyTextTemplatingToString(
      text,
      this._personalizationProperties
    );
    return resolvedText || text;
  }

  private static template(): HTMLTemplateElement {
    const template = document.createElement("template");
    template.innerHTML = SWRVE_IAM_BUTTON_TEMPLATE_LITERAL;

    return template;
  }
}

export default HTMLSwrveButtonElement;
