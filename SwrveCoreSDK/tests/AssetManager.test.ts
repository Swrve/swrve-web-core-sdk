import { AssetManager } from "../src/Campaigns/AssetManager";
import { SwrveButton } from "../src/Campaigns/Messages/UIElements/SwrveButton";
import { SwrveImage } from "../src/Campaigns/Messages/UIElements/SwrveImage";
import { ISwrveAsset, ISwrveImage } from "../src/interfaces/ISwrveCampaign";
import { IAsset } from "../src/interfaces/IAsset";
import SwrveLogger from "../src/utils/SwrveLogger";

import * as button1 from "./resources/json/AssetManagerTests-button1.json";
import * as button2 from "./resources/json/AssetManagerTests-button2.json";
import { SwrveCoreSDK } from "../src/SwrveCoreSDK";
import PlatformMock from "./mocks/PlatformMock";

const assets: ReadonlyArray<ISwrveAsset> = [
  new SwrveButton(button1, "testcdn://"),
  new SwrveButton(button2, "testcdn://"),
];

// return the mocked platform since module does not have one
const platform = new PlatformMock();
jest.spyOn(SwrveCoreSDK, "getPlatform").mockReturnValue(platform);

const imageAsset = new SwrveImage(
  {
    image: { type: "asset", value: "image-sha" },
    w: { type: "number", value: 100 },
    h: { type: "number", value: 140 },
  } as ISwrveImage,
  "testcdn://"
);

const videoAsset = new SwrveImage(
  {
    image: { type: "asset", value: "video-sha" },
    w: { type: "number", value: 100 },
    h: { type: "number", value: 140 },
    media_format: "mp4",
    video_settings: {
      auto_play: true,
      loop: false,
      fill_screen: false,
      show_controls: true,
    },
  } as ISwrveImage,
  "testcdn://"
);

describe("Asset Manager", () => {
  it("Adds keys to asset list", () => {
    const assetManager = new AssetManager();
    assetManager
      .manageAssets(assets)
      .then(() => {
        const assetList = assetManager["assets"];

        expect(assetList["d31a9dcec7bb2c2a0bbd63451cea799fdb774d76"]).not.toBe(
          null
        );
        expect(assetList["fa9f4a3738a8dbbd63f16bb8d0061e66f33d243d"]).not.toBe(
          null
        );
      })
      .catch((error) => SwrveLogger.info(" error managing assets " + error));
  });
});

describe("Asset Manager video assets", () => {
  afterEach(() => jest.restoreAllMocks());

  it("Gates campaigns on video assets like any other asset", () => {
    /* the platform caches video with a no-cors fetch and reports it stored
       once that preload resolves, so video gates exactly like an image */
    jest.spyOn(platform, "checkStorageForAsset").mockReturnValue(false);

    const assetManager = new AssetManager();

    expect(assetManager.checkAssetsForCampaign([videoAsset])).toBe(false);
  });

  it("Passes campaigns whose video asset the platform reports as stored", () => {
    jest.spyOn(platform, "checkStorageForAsset").mockReturnValue(true);

    const assetManager = new AssetManager();

    expect(assetManager.checkAssetsForCampaign([videoAsset])).toBe(true);
  });

  it("Still gates campaigns on image assets being in the asset cache", () => {
    jest.spyOn(platform, "checkStorageForAsset").mockReturnValue(false);

    const assetManager = new AssetManager();

    expect(assetManager.checkAssetsForCampaign([imageAsset])).toBe(false);
  });

  it("Queues video assets for download, flagged so the platform can cache them", async () => {
    const downloadSpy = jest
      .spyOn(platform, "downloadAssets")
      .mockResolvedValue(undefined);

    const assetManager = new AssetManager();
    await assetManager.manageAssets([imageAsset, videoAsset]);

    const queued = downloadSpy.mock.calls[0][0] as ReadonlyArray<IAsset>;
    expect(
      queued.map((asset) => ({ path: asset.path, isVideo: !!asset.isVideo }))
    ).toEqual([
      { path: "testcdn://image-sha", isVideo: false },
      { path: "testcdn://video-sha", isVideo: true },
    ]);
  });
});
