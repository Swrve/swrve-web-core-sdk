import { SwrveMessageDisplayManager } from "../src/Campaigns/Messages/SwrveMessageDisplayManager";
import SwrveConfig from "../src/Config/SwrveConfig";
import {
  ISwrveCampaignResourceResponse,
  ISwrveMessage,
} from "../src/interfaces/ISwrveCampaign";
import PlatformMock from "./mocks/PlatformMock";

import _oneImage = require("./resources/json/SwrveMessageDisplayManagerTests-oneImage.json");
const oneImage: ISwrveCampaignResourceResponse = _oneImage as any;

/**
 * This file deliberately holds a single display manager scenario. The custom
 * elements must still be undefined when the manager is constructed, which is
 * only true for the first manager built in a document, so it cannot share a
 * file with the other display manager tests.
 */
describe("in-app config on the first display manager in a document", () => {
  it("reaches the message element even though it is created before the elements are defined", () => {
    expect(window.customElements.get("swrve-in-app-message")).toBeUndefined();

    const config = new SwrveConfig({
      appId: 30512,
      apiKey: "apiKey",
      inAppMessageConfig: {
        autoShowMessagesMaxDelay: 5000,
        defaultBackgroundColor: "rgb(1, 2, 3)",
      },
    });
    const manager = new SwrveMessageDisplayManager(new PlatformMock(), config);

    const campaign = oneImage.campaigns.campaigns[0];
    manager.showMessage(
      campaign.message as ISwrveMessage,
      campaign,
      "https://test.cdn/"
    );

    const element = document.getElementsByTagName("swrve-in-app-message")[0];
    expect((element as any)._overlayElement.style.backgroundColor).toBe(
      "rgb(1, 2, 3)"
    );
  });
});
