import IDictionary from "../../interfaces/IDictionary";
import { SwrveImage } from "./UIElements/SwrveImage";
import { TextTemplating } from "../../utils/TextTemplating";
import {
  getCalibratedFontSize,
  getMultiLineTextFittedFontSize,
  getSingleLineTextFittedFontSize,
} from "../../utils/TextSizeHelper";
import SwrveLogger from "../../utils/SwrveLogger";
import {
  DEFAULT_IAM_TEXT_BACKGROUND_COLOR,
  DEFAULT_IAM_TEXT_FONT,
  DEFAULT_IAM_TEXT_FOREGROUND_COLOR,
} from "./SwrveInAppConstants";
import { ISwrveInAppMessageConfig } from "../../interfaces/ISwrveConfig";

/**
 * Wires video playback events to Swrve generic-campaign events.
 *
 * The native HTMLVideoElement `loop` attribute is deliberately NOT used: a
 * looping <video> never fires the "ended" event, which would suppress
 * `video_ended`. Instead looping is handled manually so `video_ended` still
 * fires (once), mirroring iOS `SwrveVideoPlayerView.videoFinishedPlaying`.
 */
export function attachVideoEventHandlers(
  video: HTMLVideoElement,
  loop: boolean,
  onVideoEvent: (actionType: string) => void
): void {
  let started = false;
  let ended = false;

  video.addEventListener("play", () => {
    if (!started) {
      started = true;
      onVideoEvent("video_started");
    }
  });

  video.addEventListener("ended", () => {
    if (!ended) {
      ended = true;
      onVideoEvent("video_ended");
    }

    if (loop) {
      video.currentTime = 0;
      // play() rejects if interrupted (e.g. the IAM is dismissed as the video
      // ends) or blocked by autoplay policy — swallow it to avoid an unhandled
      // promise rejection.
      void video.play().catch(() => undefined);
    }
  });
}

class HTMLSwrveImageElement extends HTMLElement {
  private _root: ShadowRoot;
  private _image!: SwrveImage;
  private _canvasWidth!: number;
  private _canvasHeight!: number;
  private _personalizationProperties?: IDictionary<string>;
  private _inAppConfig?: ISwrveInAppMessageConfig;
  public onVideoEvent?: (actionType: string, mediaId?: number) => void;

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

  public set personalizationProperties(
    personalizationProperties: IDictionary<string>
  ) {
    this._personalizationProperties = personalizationProperties;
  }

  public set inAppConfig(inAppConfig: ISwrveInAppMessageConfig | undefined) {
    this._inAppConfig = inAppConfig;
  }

  connectedCallback(): void {
    this.configureHostLayout();

    if (this._image.isSingleLineText) {
      this.appendText();
    } else if (this._image.isMultiLineText) {
      this.appendMultilineText();
    } else if (this._image.isVideo) {
      this.appendVideo();
    } else {
      this.appendImage();
    }
  }

  private appendImage(): void {
    const style = document.createElement("style") as HTMLStyleElement;
    const image = document.createElement("img") as HTMLImageElement;
    style.textContent += `
      img {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: ${this._image.hasDynamicUrl ? "contain" : "cover"};
        object-position: center;
      }
    `;
    image.src = this._image.getAssetPath();
    this._root.appendChild(style);
    this._root.appendChild(image);
  }

  private appendVideo(): void {
    const style = document.createElement("style") as HTMLStyleElement;
    const video = document.createElement("video") as HTMLVideoElement;
    const settings = this._image.image.video_settings || {};
    const autoPlay =
      settings.auto_play === undefined ? true : settings.auto_play;
    const loop = settings.loop === undefined ? true : settings.loop;
    const showControls =
      settings.show_controls === undefined ? true : settings.show_controls;
    const fillScreen =
      settings.fill_screen === undefined ? false : settings.fill_screen;

    style.textContent += `
      video {
        width: 100%;
        height: 100%;
        display: block;
        object-fit: ${fillScreen ? "cover" : "contain"};
        object-position: center;
        background: transparent;
      }
    `;

    video.src = this._image.getAssetPath();
    video.autoplay = autoPlay;
    video.controls = showControls;
    video.playsInline = true;
    video.preload = "metadata";

    if (autoPlay) {
      // Browser autoplay policies generally require muted inline playback.
      video.muted = true;
    }

    if (this._image.image.accessibility_text) {
      video.setAttribute("aria-label", this._image.image.accessibility_text);
    }

    attachVideoEventHandlers(video, loop, (actionType) =>
      this.dispatchVideoEvent(actionType)
    );

    this._root.appendChild(style);
    this._root.appendChild(video);
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
    const fittedFontSize = getSingleLineTextFittedFontSize(
      this._image.getWidth(),
      this._image.getHeight(),
      text,
      this.textFontStyle
    );
    const fontSize = Math.min(
      fittedFontSize,
      getCalibratedFontSize(
        fittedFontSize,
        this._image.calibration,
        this.textFontStyle
      )
    );

    style.textContent += `
      .text {
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        font-size: ${fontSize}px;
        background-color: ${this.normalizeColor(this.textBackgroundColor)};
        color: ${this.normalizeColor(this.textForegroundColor)};
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

  private appendMultilineText(): void {
    const multilineText = this._image.image.multiline_text;
    if (!multilineText) {
      return;
    }

    const style = document.createElement("style") as HTMLStyleElement;
    const textElement = document.createElement("div") as HTMLDivElement;
    const text =
      this.resolvePersonalizedText(multilineText.value) || multilineText.value;
    const lineHeight = Number(multilineText.line_height || 1.2);
    const padding = multilineText.padding || {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    };
    const fontFamily = this.getFontFamily(
      multilineText.font_file,
      multilineText.font_postscript_name
    );
    let fontSize = getCalibratedFontSize(
      Number(multilineText.font_size || 14),
      this._image.calibration,
      fontFamily
    );

    if (!multilineText.scrollable) {
      fontSize = getMultiLineTextFittedFontSize(
        this._image.getWidth(),
        this._image.getHeight(),
        text,
        fontFamily,
        fontSize,
        lineHeight,
        padding
      );
    }

    textElement.className = "multiline-text";
    textElement.innerText = text;

    style.textContent += `
      .multiline-text {
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
        font-size: ${fontSize}px;
        line-height: ${lineHeight};
        background-color: ${this.normalizeColor(
          multilineText.bg_color || this.textBackgroundColor
        )};
        color: ${this.normalizeColor(
          multilineText.font_color || this.textForegroundColor
        )};
        font-family: ${fontFamily};
        font-weight: ${this.getFontWeight(multilineText.font_native_style)};
        font-style: ${this.getFontStyle(multilineText.font_native_style)};
        text-align: ${this.getTextAlign(multilineText.h_align)};
        position: absolute;
        box-sizing: border-box;
        border: none;
        padding: ${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px;
        z-index: 2;
        overflow-x: hidden;
        overflow-y: ${multilineText.scrollable ? "auto" : "hidden"};
        white-space: pre-wrap;
        overflow-wrap: break-word;
        pointer-events: ${multilineText.scrollable ? "auto" : "none"};
      }
    `;

    this._root.appendChild(style);
    this._root.appendChild(textElement);
  }

  private configureHostLayout(): void {
    this.style.position = "absolute";
    this.style.display = "block";
    if (
      this._image.isVideo &&
      this._image.image.video_settings &&
      this._image.image.video_settings.fill_screen
    ) {
      this.style.top = "0";
      this.style.left = "0";
      this.style.width = `${this.canvasWidth}px`;
      this.style.height = `${this.canvasHeight}px`;
    } else {
      this.style.top = `${this.absoluteTopPosition()}px`;
      this.style.left = `${this.absoluteLeftPosition()}px`;
      this.style.width = `${this._image.getWidth()}px`;
      this.style.height = `${this._image.getHeight()}px`;
    }
    this.style.zIndex = `${this.getIAMZIndex()}`;
  }

  private getIAMZIndex(): number {
    const zIndex = Number(this._image.image.iam_z_index || 0);
    return isNaN(zIndex) ? 0 : zIndex;
  }

  private dispatchVideoEvent(actionType: string): void {
    if (this.onVideoEvent) {
      this.onVideoEvent(actionType, this._image.image.media_id);
    }
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

  private getTextAlign(align?: string): string {
    switch (align) {
      case "CENTER":
        return "center";
      case "RIGHT":
        return "right";
      default:
        return "left";
    }
  }

  private getFontFamily(fontFile?: string, postscriptName?: string): string {
    if (postscriptName) {
      return postscriptName;
    }

    if (fontFile && fontFile !== "_system_font_") {
      return fontFile;
    }

    return this.textFontStyle;
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
}

export default HTMLSwrveImageElement;
