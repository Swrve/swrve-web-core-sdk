import { ISwrveAsset } from "../interfaces/ISwrveCampaign";
import PAL from "../utils/PAL";
import { IAsset } from "../interfaces/IAsset";
import SwrveLogger from "../utils/SwrveLogger";

export class AssetManager {
  private assets: { [key: string]: IAsset } = {};
  private _imagesCDN: string = "";
  private _fontsCDN: string = "";

  public manageAssets(newAssets: ReadonlyArray<ISwrveAsset>): Promise<void> {
    for (const asset of newAssets) {
      const key = asset.getAssetID();
      if (this.assets[key] === undefined) {
        SwrveLogger.info("add new asset " + key);
        this.assets[key] = {
          id: key,
          path: asset.getAssetPath().toString(),
          /* the platform cannot tell a video from an image by its path - video
             assets arrive as arbitrary third-party URLs - so flag it here and
             let the platform pick how to cache it */
          isVideo: !!asset.isVideo
        };
      }
    }

    return this.downloadAssets();
  }

  public set ImagesCDN(cdn: string) {
    this._imagesCDN = cdn;
  }

  public get ImagesCDN(): string {
    return this._imagesCDN;
  }

  public set FontsCDN(cdn: string) {
    this._fontsCDN = cdn;
  }

  public get FontsCDN(): string {
    return this._fontsCDN;
  }

  public clearCDN(): void {
    this._imagesCDN = "";
    this._fontsCDN = "";
  }

  public checkAssetsForCampaign(assets: ReadonlyArray<ISwrveAsset>): boolean {
    let allLoaded = true;

    for (const asset of assets) {
      const isLoaded = this.checkCache(asset);
      if (!isLoaded) {
        allLoaded = false;
        break;
      }
    }

    return allLoaded;
  }

  private checkCache(asset: ISwrveAsset): boolean {
    return PAL.getPlatform().checkStorageForAsset(asset);
  }

  private downloadAssets(): Promise<void> {
    SwrveLogger.info("download assets");
    const values = Object.keys(this.assets).map((key) => this.assets[key]);
    return PAL.getPlatform().downloadAssets(values);
  }
}
