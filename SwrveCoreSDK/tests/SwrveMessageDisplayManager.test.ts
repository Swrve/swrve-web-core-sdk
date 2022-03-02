import { CampaignManager } from "../src/Campaigns/CampaignManager";
import { ProfileManager } from "../src/Profile/ProfileManager";
import { StorageManager } from "../src/Storage/StorageManager";
import { SwrveCoreSDK } from "../src/SwrveCoreSDK";
import {
  ISwrveCampaignResourceResponse,
  ISwrveMessage,
} from "../src/interfaces/ISwrveCampaign";
import PlatformMock from "./mocks/PlatformMock";
import SwrveLogger from "../src/utils/SwrveLogger";
import {
  SWRVE_IAM_CONTAINER,
  SWRVE_OVERLAY_CONTAINER,
} from "../src/utils/SwrveConstants";

const twoDays = 172800000;

import _oneButton = require("./resources/json/SwrveMessageDisplayManagerTests-oneButton.json");
const oneButton: ISwrveCampaignResourceResponse = _oneButton as any;
oneButton.campaigns.campaigns[0].start_date = Date.now() - twoDays;
oneButton.campaigns.campaigns[0].end_date = Date.now() + twoDays;
oneButton.campaigns.campaigns[0].rules.min_delay_between_messages =
  Date.now() + twoDays;

import _twoButtons = require("./resources/json/SwrveMessageDisplayManagerTests-twoButtons.json");
const twoButtons: ISwrveCampaignResourceResponse = _twoButtons as any;
twoButtons.campaigns.campaigns[0].start_date = Date.now() - twoDays;
twoButtons.campaigns.campaigns[0].end_date = Date.now() + twoDays;
twoButtons.campaigns.campaigns[0].rules.min_delay_between_messages =
  Date.now() + twoDays;

import _threeButtons = require("./resources/json/SwrveMessageDisplayManagerTests-threeButtons.json");
const threeButtons: ISwrveCampaignResourceResponse = _threeButtons as any;
threeButtons.campaigns.campaigns[0].start_date = Date.now() - twoDays;
threeButtons.campaigns.campaigns[0].end_date = Date.now() + twoDays;
threeButtons.campaigns.campaigns[0].rules.min_delay_between_messages =
  Date.now() + twoDays;

import _oneImage = require("./resources/json/SwrveMessageDisplayManagerTests-oneImage.json");
const oneImage: ISwrveCampaignResourceResponse = _oneImage as any;
oneImage.campaigns.campaigns[0].start_date = Date.now() - twoDays;
oneImage.campaigns.campaigns[0].end_date = Date.now() + twoDays;

import _scaled = require("./resources/json/SwrveMessageDisplayManagerTests-scaled.json");
const scaled: ISwrveCampaignResourceResponse = _scaled as any;
scaled.campaigns.campaigns[0].start_date = Date.now() - twoDays;
scaled.campaigns.campaigns[0].end_date = Date.now() + twoDays;
scaled.campaigns.campaigns[0].rules.min_delay_between_messages =
  Date.now() + twoDays;

// setup global vars
let impressionHandler = (msg: ISwrveMessage) => {};
let onQATriggerCallback = () => {};
let platform = new PlatformMock();
let storageManager = new StorageManager(platform);
let user = {
  userId: "SwrveUser",
  sessionToken: "abc",
  nextSeqNum: 1,
  sessionStart: Date.now(),
  isQAUser: false,
  qaUserNextSeqNum: 0,
};
let profileManager = new ProfileManager(
  user.userId,
  30512,
  "apiKey",
  1000,
  storageManager
);
let campaignManager = new CampaignManager(profileManager, platform, storageManager);

const cleanUpDom = () => {
  const iamContainer = document.getElementById(SWRVE_OVERLAY_CONTAINER);
  if (iamContainer) {
    document.body.removeChild(iamContainer);
  }
};

const moveIAMOffscreen = () => {
  const container = document.getElementById(SWRVE_OVERLAY_CONTAINER);

  if (container) {
    container.style.left = "-10000px";
  }
};

describe("MESSAGE DISPLAY MANAGER TESTS", () => {
  jest.spyOn(SwrveCoreSDK, "getPlatform").mockReturnValue(new PlatformMock());

  beforeEach(async () => {
    platform
      .init(["language", "countryCode", "timezone", "firmware"])
      .then(() => {
        platform.synchronousStorage.clear();
        cleanUpDom();
        campaignManager = new CampaignManager(profileManager, platform, storageManager);
        jest
          .spyOn(campaignManager.getAssetManager(), "checkAssetsForCampaign")
          .mockReturnValue(true);
      });
  });

  it("adds IAM container and one button", (done) => {
    campaignManager.storeCampaigns(oneButton, () => {
      campaignManager.checkTriggers("tv.event_simple", {}, impressionHandler, true);
      moveIAMOffscreen();
      const container = document.getElementById(SWRVE_OVERLAY_CONTAINER);
      const button1 = document.getElementById("SwrveButton0");

      expect(container).not.toBeNull();
      expect(button1).not.toBeNull();

      done();
    });
  });

  it("adds IAM container and two buttons", (done) => {
    campaignManager.storeCampaigns(twoButtons, () => {
      campaignManager.checkTriggers("tv.event_simple", {}, impressionHandler, true);
      moveIAMOffscreen();

      const container = document.getElementById(SWRVE_OVERLAY_CONTAINER);
      const button1 = document.getElementById("SwrveButton0");
      const button2 = document.getElementById("SwrveButton1");

      expect(container).not.toBeNull();
      expect(button1).not.toBeNull();
      expect(button2).not.toBeNull();

      done();
    });
  });

  it("adds IAM container and three buttons", (done) => {
    campaignManager.storeCampaigns(threeButtons, () => {
      campaignManager.checkTriggers("tv.event_simple", {}, impressionHandler, true);
      moveIAMOffscreen();

      const container = document.getElementById(SWRVE_OVERLAY_CONTAINER);
      const button1 = document.getElementById("SwrveButton0");
      const button2 = document.getElementById("SwrveButton1");
      const button3 = document.getElementById("SwrveButton2");

      expect(container).not.toBeNull();
      expect(button1).not.toBeNull();
      expect(button2).not.toBeNull();
      expect(button3).not.toBeNull();

      done();
    });
  });

  it("adds IAM container and one image", (done) => {
    campaignManager.storeCampaigns(oneImage, () => {
      campaignManager.checkTriggers("tv.event_simple", {}, impressionHandler, true);
      moveIAMOffscreen();

      const container = document.getElementById(SWRVE_IAM_CONTAINER);
      const image0 = document.getElementById("SwrveImage0");

      expect(container).not.toBeNull();
      expect(image0).not.toBeNull();
      done();
    });
  });

  it("applies scale", () => {
    campaignManager.storeCampaigns(scaled, () => {
      campaignManager.checkTriggers("tv.event_simple", {}, impressionHandler, true);
      moveIAMOffscreen();
      const button1 = document.getElementById("SwrveButton0") as HTMLImageElement;

      if (button1) {
        const originalSize = 80;
        expect(button1).not.toBeNull();
        expect(button1.width).toEqual(originalSize * 1.5);
      } else {
        fail("Button was not created.");
      }
    });
  });
});
