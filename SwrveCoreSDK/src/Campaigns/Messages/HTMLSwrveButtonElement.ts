import IDictionary from "../../interfaces/IDictionary";
import { SwrveButton } from "./UIElements/SwrveButton";
import { TextTemplating } from "../../utils/TextTemplating";
import { DEFAULT_IAM_TEXT_BACKGROUND_COLOR, DEFAULT_IAM_TEXT_FONT, DEFAULT_IAM_TEXT_FOREGROUND_COLOR, SWRVE_IAM_BUTTON_TEMPLATE_LITERAL } from "./SwrveInAppConstants";
import {
  getCalibratedFontSize,
  getSingleLineTextFittedFontSize,
} from "../../utils/TextSizeHelper";
import { ISwrveInAppMessageConfig } from "../../interfaces/ISwrveConfig";
import { toCSSDeclarations } from "../../utils/CSSStyleHelper";

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

    if (this._inAppConfig && this._inAppConfig.personalizedTextForegroundColor) {
      foregroundColor = this._inAppConfig.personalizedTextForegroundColor!;
    }

    return foregroundColor;
  }

  public get textBackgroundColor(): string {
    let foregroundColor = DEFAULT_IAM_TEXT_BACKGROUND_COLOR;

    if (this._inAppConfig && this._inAppConfig.personalizedTextBackgroundColor) {
      foregroundColor = this._inAppConfig.personalizedTextBackgroundColor!;
    }

    return foregroundColor;
  }

  public get textFontStyle(): string {
    let fontStyle = DEFAULT_IAM_TEXT_FONT;

    if (this._inAppConfig && this._inAppConfig.personalizedTextFontStyle) {
      fontStyle = this._inAppConfig.personalizedTextFontStyle;
    }

    return fontStyle;
  }

  /* The personalized text config applies to legacy text buttons only. A themed
   * button is styled entirely by the theme its campaign carries, matching iOS
   * (SwrveThemedUIButton) and Android (SwrveThemedMaterialButton), where the
   * config values are never consulted for themed buttons and the theme's own
   * values fall back to transparent or the SDK defaults. */
  private get themedButtonForegroundColor(): string {
    return this._button.isThemed
      ? DEFAULT_IAM_TEXT_FOREGROUND_COLOR
      : this.textForegroundColor;
  }

  private get themedButtonBackgroundColor(): string {
    return this._button.isThemed
      ? DEFAULT_IAM_TEXT_BACKGROUND_COLOR
      : this.textBackgroundColor;
  }

  private get themedButtonFontStyle(): string {
    return this._button.isThemed ? DEFAULT_IAM_TEXT_FONT : this.textFontStyle;
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
    this.configureHostLayout();
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
    const theme = this._button.button.theme;
    const padding = theme && theme.padding ? theme.padding : {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };
    const borderWidth = Number((theme && theme.border_width) || 0);
    const fontFamily = this.getFontFamily(
      theme && theme.font_file,
      theme && theme.font_postscript_name
    );
    const baseFontSize = theme && theme.font_size
      ? getCalibratedFontSize(
          Number(theme.font_size),
          this._button.calibration,
          fontFamily
        )
      : getSingleLineTextFittedFontSize(
          this._button.getWidth(),
          this._button.getHeight(),
          text,
          fontFamily
        );
    const availableWidth = this._button.getWidth() - padding.left - padding.right - borderWidth;
    const availableHeight = this._button.getHeight() - padding.top - padding.bottom - borderWidth;
    const fittedFontSize = theme && theme.truncate
      ? baseFontSize
      : Math.min(
          baseFontSize,
          getSingleLineTextFittedFontSize(
            availableWidth,
            availableHeight,
            text,
            fontFamily
          )
        );
    const pressedState = theme && theme.pressed_state;
    const focusedState = theme && theme.focused_state;

    this._$button.ariaLabel = text;
    this._$button.textContent = text;
    this._$styles.textContent += `
      button {
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        box-sizing: border-box;
        font-size: ${fittedFontSize}px;
        background-color: ${this.normalizeColor((theme && theme.bg_color) || this.themedButtonBackgroundColor)};
        ${this.getBackgroundImageStyle(theme && theme.bg_image)}
        color: ${this.normalizeColor((theme && theme.font_color) || this.themedButtonForegroundColor)};
        font-family: ${fontFamily};
        font-weight: ${this.getFontWeight(theme && theme.font_native_style)};
        font-style: ${this.getFontStyle(theme && theme.font_native_style)};
        border-style: solid;
        border-width: ${borderWidth}px;
        border-color: ${this.normalizeColor((theme && theme.border_color) || "transparent")};
        border-radius: ${this.getCornerRadius()}px;
        padding: ${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px;
        text-align: ${this.getTextAlign(theme && theme.h_align)};
        overflow: hidden;
        text-overflow: ${theme && theme.truncate ? "ellipsis" : "clip"};
        white-space: ${theme && theme.truncate ? "nowrap" : "normal"};
        line-height: 1.2;
        display: block;
      }

      /* Keyboard and remote focus. The fallback chain mirrors Android's themed
       * button, where the focused colours default to the pressed colours when a
       * campaign defines no focused state of its own. */
      button:focus {
        background-color: ${this.normalizeColor((focusedState && focusedState.bg_color) || (pressedState && pressedState.bg_color) || (theme && theme.bg_color) || this.themedButtonBackgroundColor)};
        ${this.getBackgroundImageStyle((focusedState && focusedState.bg_image) || (pressedState && pressedState.bg_image))}
        color: ${this.normalizeColor((focusedState && focusedState.font_color) || (pressedState && pressedState.font_color) || (theme && theme.font_color) || this.themedButtonForegroundColor)};
        border-color: ${this.normalizeColor((focusedState && focusedState.border_color) || (pressedState && pressedState.border_color) || (theme && theme.border_color) || "transparent")};
        ${this.getFocusIndicatorStyle(!!focusedState)}
      }

      /* Pointer hover is the browser equivalent of the highlight a TV remote
       * gives a button, so the campaign's focused state applies here too.
       * Without it a mouse user would only ever see the pressed state, while the
       * same campaign shows its focused state on tvOS and Android TV as soon as
       * the item is highlighted.
       *
       * Unlike focus above, this does not fall back to the pressed colours: a
       * hover is not a press, and showing pressed colours for a campaign that
       * defines no focused state would read as a stuck button. It falls back to
       * the button's base theme instead. Emitted after the focus rule so that it
       * wins for a button that is both hovered and focused. */
      button:hover {
        background-color: ${this.normalizeColor((focusedState && focusedState.bg_color) || (theme && theme.bg_color) || this.themedButtonBackgroundColor)};
        ${this.getBackgroundImageStyle((focusedState && focusedState.bg_image) || (theme && theme.bg_image))}
        color: ${this.normalizeColor((focusedState && focusedState.font_color) || (theme && theme.font_color) || this.themedButtonForegroundColor)};
        border-color: ${this.normalizeColor((focusedState && focusedState.border_color) || (theme && theme.border_color) || "transparent")};
      }

      /* Emitted after the hover and focus rules deliberately. A button being
       * pressed is also hovered, and the rules have equal specificity, so the
       * pressed state must come last to win for the duration of the press. */
      button:active {
        background-color: ${this.normalizeColor((pressedState && pressedState.bg_color) || (theme && theme.bg_color) || this.themedButtonBackgroundColor)};
        ${this.getBackgroundImageStyle(pressedState && pressedState.bg_image)}
        color: ${this.normalizeColor((pressedState && pressedState.font_color) || (theme && theme.font_color) || this.themedButtonForegroundColor)};
        border-color: ${this.normalizeColor((pressedState && pressedState.border_color) || (theme && theme.border_color) || "transparent")};
      }
    `;
  }

  private appendImageButton(): void {
    this._$styles.textContent += `
      button {
        background-image: url(${this._button.getAssetPath()});
        background-size: ${this._button.hasDynamicUrl ? "contain" : "cover"};
        background-position: center;
        background-repeat: no-repeat;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
      }
    `;

    const configuredFocusStyle = this.getConfiguredFocusStyle();
    if (configuredFocusStyle) {
      this._$styles.textContent += `
      button:focus {
        ${configuredFocusStyle}
      }
    `;
    }
  }

  private getConfiguredFocusStyle(): string {
    return toCSSDeclarations(
      this._inAppConfig && this._inAppConfig.defaultButtonFocusStyle
    );
  }

  /**
   * Chooses what marks a themed button as focused. A campaign that defines its
   * own focused state owns the focus appearance, so the default ring is
   * suppressed as before. Otherwise the configured focus style applies, falling
   * back to suppressing the ring when nothing is configured.
   */
  private getFocusIndicatorStyle(hasCampaignFocusedState: boolean): string {
    if (hasCampaignFocusedState) {
      return "box-shadow: none;";
    }

    return this.getConfiguredFocusStyle() || "box-shadow: none;";
  }

  private configureHostLayout(): void {
    this.style.position = "absolute";
    this.style.display = "block";
    this.style.top = `${this.absoluteTopPosition()}px`;
    this.style.left = `${this.absoluteLeftPosition()}px`;
    this.style.width = `${this._button.getWidth()}px`;
    this.style.height = `${this._button.getHeight()}px`;
    this.style.zIndex = `${this.getIAMZIndex()}`;
  }

  private getIAMZIndex(): number {
    const zIndex = Number(this._button.button.iam_z_index || 0);
    return isNaN(zIndex) ? 0 : zIndex;
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

  private normalizeColor(color: string): string {
    const normalizedColor = String(color || "").trim();

    if (!normalizedColor) {
      return "transparent";
    }

    if (/^#[0-9a-f]{8}$/i.test(normalizedColor)) {
      return this.swrveHexToRgba(normalizedColor.substring(1));
    }

    if (/^[0-9a-f]{8}$/i.test(normalizedColor)) {
      return this.swrveHexToRgba(normalizedColor);
    }

    if (/^#|^rgb|^hsl|^[a-z]+$/i.test(normalizedColor)) {
      return normalizedColor;
    }

    return `#${normalizedColor}`;
  }

  private swrveHexToRgba(value: string): string {
    const alpha = parseInt(value.substring(0, 2), 16) / 255;
    const red = parseInt(value.substring(2, 4), 16);
    const green = parseInt(value.substring(4, 6), 16);
    const blue = parseInt(value.substring(6, 8), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  private getCornerRadius(): number {
    const theme = this._button.button.theme;
    if (!theme || !theme.corner_radius) {
      return 0;
    }

    return Math.min(
      Number(theme.corner_radius),
      this._button.getHeight() / 2,
      this._button.getWidth() / 2
    );
  }

  private getBackgroundImageStyle(asset?: { value: string | number }): string {
    const assetPath = this._button.getThemeAssetPath(asset);
    if (!assetPath) {
      return "";
    }

    return `
        background-image: url(${assetPath});
        background-size: ${this._button.hasDynamicUrl ? "contain" : "cover"};
        background-position: center;
        background-repeat: no-repeat;`;
  }

  private getTextAlign(align?: string): string {
    switch (align) {
      case "LEFT":
        return "left";
      case "RIGHT":
        return "right";
      default:
        return "center";
    }
  }

  private getFontFamily(fontFile?: string, postscriptName?: string): string {
    if (postscriptName) {
      return postscriptName;
    }

    if (fontFile && fontFile !== "_system_font_") {
      return fontFile;
    }

    return this.themedButtonFontStyle;
  }

  private getFontWeight(nativeStyle?: string): string {
    return nativeStyle === "Bold" || nativeStyle === "BoldItalic"
      ? "bold"
      : "normal";
  }

  private getFontStyle(nativeStyle?: string): string {
    return nativeStyle === "Italic" || nativeStyle === "BoldItalic"
      ? "italic"
      : "normal";
  }

  private static template(): HTMLTemplateElement {
    const template = document.createElement("template");
    template.innerHTML = SWRVE_IAM_BUTTON_TEMPLATE_LITERAL;

    return template;
  }
}

export default HTMLSwrveButtonElement;
