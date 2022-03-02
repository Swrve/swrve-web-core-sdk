import { AssetManager } from "../src/Campaigns/AssetManager";
import { SwrveButton } from "../src/UIElements/SwrveButton";
import { ISwrveAsset } from "../src/interfaces/ISwrveCampaign";
import SwrveLogger from "../src/utils/SwrveLogger";

import * as button1 from "./resources/json/AssetManagerTests-button1.json";
import * as button2 from "./resources/json/AssetManagerTests-button2.json";
import { SwrveCoreSDK } from "../src/SwrveCoreSDK";
import PlatformMock from "./mocks/PlatformMock";

const assets: ReadonlyArray<ISwrveAsset> = [
  new SwrveButton(button1),
  new SwrveButton(button2),
];

// return the mocked platform since module does not have one
jest.spyOn(SwrveCoreSDK, "getPlatform").mockReturnValue(new PlatformMock());

describe("Asset Manager Tests", () => {
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
