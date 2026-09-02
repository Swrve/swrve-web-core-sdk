import { ISwrveButton, ISwrveAsset, ISwrveCalibration } from "../../../interfaces/ISwrveCampaign";
import { TextTemplating } from "../../../utils/TextTemplating";
import IDictionary from "../../../interfaces/IDictionary";
import SwrveLogger from "../../../utils/SwrveLogger";
import { CUSTOM } from "../../../utils/SwrveConstants";

export class SwrveButton implements ISwrveAsset {
  private _button: ISwrveButton;
  private _cdn: string;
  private _scale?: number;
  private _calibration?: ISwrveCalibration;
  private _hasDynamicUrl: boolean;
  private _isSingleLineText: boolean;
  private _isThemed: boolean;
  private _personalizationProperties?: IDictionary<string>;

  constructor(
    button: ISwrveButton,
    cdn: string,
    personalizationProperties?: IDictionary<string>,
    scale?: number,
    calibration?: ISwrveCalibration
  ) {
    this._button = button;
    this._cdn = cdn;
    this._scale = scale;
    this._calibration = calibration;
    this._hasDynamicUrl = !!this._button.dynamic_image_url;
    this._isSingleLineText = !!this._button.text;
    this._isThemed = !!this._button.theme;
    this._personalizationProperties = personalizationProperties;
  }

  public get button(): ISwrveButton {
    return this._button;
  }

  public get isVideo(): boolean {
    return false;
  }

  public get scale(): number | undefined {
    return this._scale;
  }

  public get calibration(): ISwrveCalibration | undefined {
    return this._calibration;
  }

  public get hasDynamicUrl(): boolean {
    return this._hasDynamicUrl;
  }

  public get isSingleLineText(): boolean {
    return this._isSingleLineText;
  }

  public get isThemed(): boolean {
    return this._isThemed;
  }

  public getAssetID(): string | number {
    if (this.button.image_up) {
      return this.resolveOrFallbackUrlPersonalization(
        this.button.image_up.value
      );
    } else {
      return this.resolveOrFallbackUrlPersonalization("");
    }
  }

  public getAssetPath(): string {
    if (this.button.image_up) {
      return this.resolveOrFallbackUrlPersonalization(
        `${this._cdn}${this.button.image_up.value}`
      ) as string;
    } else {
      return this.resolveOrFallbackUrlPersonalization("") as string;
    }
  }

  public getThemeAssetPath(asset?: { value: string | number }): string {
    if (asset && asset.value) {
      return `${this._cdn}${asset.value}`;
    }

    return "";
  }

  public canRender(): boolean {
    /* A CUSTOM action is templated at click time, so an action whose
       personalization cannot be resolved excludes the campaign entirely -
       matching iOS (personalizationFailureReason) and Android
       (SwrveMessageTextTemplatingChecks). Checked ahead of the per-variant
       branches below so it applies to every button variant. */
    if (!this.canResolveAction()) {
      return false;
    }

    if (this.isSingleLineText) {
      const resolved = this.resolveTextTemplating(
        <string>this.button.text!.value,
        this._personalizationProperties
      )
      
      /** return directly since if there's single text then it should either resolve or not show up at all */
      return (resolved !== null);
    }

    if (this.isThemed) {
      const text = this.button.text ? <string>this.button.text.value : "";
      if (!text) return true;

      const resolved = this.resolveTextTemplating(
        text,
        this._personalizationProperties
      )

      return (resolved !== null);
    }

    if (this.hasDynamicUrl) {
      const response = this.resolveTextTemplating(
        this._button.dynamic_image_url!,
        this._personalizationProperties
      );
      if (response !== null) return true;
    }

    if (this._button.image_up !== undefined) {
      return true;
    }

    return false;
  }

  public getWidth(): number {
    if (this.hasDynamicUrl || this.isThemed) {
      return <number>this.button.w.value;
    }

    return this.button.image_width || <number>this.button.w.value;
  }

  public getHeight(): number {
    if (this.hasDynamicUrl || this.isThemed) {
      return <number>this.button.h.value;
    }

    return this.button.image_height || <number>this.button.h.value;
  }

  private canResolveAction(): boolean {
    if (String(this._button.type.value) !== CUSTOM) {
      return true;
    }

    const action = this._button.action
      ? String(this._button.action.value || "")
      : "";

    if (!action) {
      return true;
    }

    return (
      this.resolveTextTemplating(action, this._personalizationProperties) !==
      null
    );
  }

  private resolveOrFallbackUrlPersonalization(
    fallback: string | number
  ): string | number {
    if (this.hasDynamicUrl) {
      try {
        const resolvedUrl = TextTemplating.applyTextTemplatingToString(
          this.button.dynamic_image_url!,
          this._personalizationProperties
        );
        if (resolvedUrl !== null) {
          return resolvedUrl;
        }
      } catch (e) {}
    }

    return fallback;
  }

  private resolveTextTemplating(
    text: string,
    personalizationProperties?: IDictionary<string>
  ): string | null {
    try {
      const resolvedText = TextTemplating.applyTextTemplatingToString(
        text,
        personalizationProperties
      );
      if (resolvedText !== null) {
        return resolvedText;
      }
    } catch (e) {
      SwrveLogger.debug("Could not resolve personalization for: " + text);
    }

    return null;
  }
}
