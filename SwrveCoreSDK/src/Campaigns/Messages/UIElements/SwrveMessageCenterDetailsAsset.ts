import {
  ISwrveAsset,
  ISwrveMessageCenterDetails,
} from "../../../interfaces/ISwrveCampaign";
import IDictionary from "../../../interfaces/IDictionary";
import { TextTemplating } from "../../../utils/TextTemplating";
import SwrveLogger from "../../../utils/SwrveLogger";

export class SwrveMessageCenterDetailsAsset implements ISwrveAsset {
  constructor(
    private details: ISwrveMessageCenterDetails,
    private cdn: string,
    private personalizationProperties?: IDictionary<string>
  ) {}

  public get isVideo(): boolean {
    return false;
  }

  public canRender(): boolean {
    if (this.details.dynamic_image_url) {
      return this.resolveDynamicImageUrl() !== null;
    }

    return !!this.details.image_asset;
  }

  public getAssetID(): string | number {
    const dynamicImageUrl = this.resolveDynamicImageUrl();
    if (dynamicImageUrl !== null) {
      return dynamicImageUrl;
    }

    return this.details.image_asset || "";
  }

  public getAssetPath(): string | number {
    const dynamicImageUrl = this.resolveDynamicImageUrl();
    if (dynamicImageUrl !== null) {
      return dynamicImageUrl;
    }

    return this.details.image_asset ? `${this.cdn}${this.details.image_asset}` : "";
  }

  private resolveDynamicImageUrl(): string | null {
    if (!this.details.dynamic_image_url) {
      return null;
    }

    try {
      return TextTemplating.applyTextTemplatingToString(
        this.details.dynamic_image_url,
        this.personalizationProperties
      );
    } catch {
      SwrveLogger.debug(
        "Could not resolve personalization for: " +
          this.details.dynamic_image_url
      );
      return null;
    }
  }
}
