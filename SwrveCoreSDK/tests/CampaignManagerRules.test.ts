import { CampaignManager } from "../src/Campaigns/CampaignManager";
import {
  CAMPAIGN_NOT_ACTIVE,
  CAMPAIGN_THROTTLE_LAUNCH_TIME,
  CAMPAIGN_THROTTLE_MAX_IMPRESSIONS,
  CAMPAIGN_THROTTLE_RECENT,
  GLOBAL_CAMPAIGN_THROTTLE_LAUNCH_TIME,
  GLOBAL_CAMPAIGN_THROTTLE_MAX_IMPRESSIONS,
  GLOBAL_CAMPAIGN_THROTTLE_RECENT,
  CAMPAIGN_MATCH,
  CAMPAIGN_NO_MATCH,
  SWRVE_OVERLAY_CONTAINER,
} from "../src/utils/SwrveConstants";
import {
  ISwrveCampaignResourceResponse,
  ISwrveEmbeddedMessage,
  ISwrveMessage,
} from "../src/interfaces/ISwrveCampaign";
import { EventFactory } from "../src/Events/EventFactory";
import { SwrveCoreSDK } from "../src/SwrveCoreSDK";
import { Swrve } from "../src/Swrve";
import { EventManager } from "../src/Events/EventManager";
import { StorageManager } from "../src/Storage/StorageManager";
import { ProfileManager } from "../src/Profile/ProfileManager";
import SwrveLogger from "../src/utils/SwrveLogger";
import { SWRVE_IAM_CONTAINER } from "../src/utils/SwrveConstants";
import SwrveEvent from "./WebApi/Events/SwrveEvent";
import { MockSwrveRestClient } from "./mocks/MockSwrveRestClient";
import PlatformMock from "./mocks/PlatformMock";
import { ISwrveConfig } from "../src/interfaces/ISwrveConfig";
import SwrveConfig from "../src/Config/SwrveConfig";

const twoDays = 172800000;

import _noNameMatches = require("./resources/json/CampaignManagerRulesTests-noNameMatches.json");
const noNameMatches: ISwrveCampaignResourceResponse = _noNameMatches as any;
noNameMatches.campaigns.campaigns[0].start_date = Date.now() - twoDays;
noNameMatches.campaigns.campaigns[0].end_date = Date.now() + twoDays;

import _multipleMatches = require("./resources/json/CampaignManagerRulesTests-multipleMatches.json");
const multipleMatches: ISwrveCampaignResourceResponse = _multipleMatches as any;
multipleMatches.campaigns.campaigns[0].start_date = Date.now() - twoDays;
multipleMatches.campaigns.campaigns[0].end_date = Date.now() + twoDays;
multipleMatches.campaigns.campaigns[1].start_date = Date.now() - twoDays;
multipleMatches.campaigns.campaigns[1].end_date = Date.now() + twoDays;
multipleMatches.campaigns.campaigns[1].rules.min_delay_between_messages =
  Date.now() + twoDays;

import _onStartupTrigger = require("./resources/json/CampaignManagerRulesTests-onStartupTrigger.json");
const onStartupTrigger: ISwrveCampaignResourceResponse =
  _onStartupTrigger as any;
onStartupTrigger.campaigns.campaigns[0].start_date = Date.now() - twoDays;
onStartupTrigger.campaigns.campaigns[0].end_date = Date.now() + twoDays;

import _onDelayedStartupTrigger = require("./resources/json/CampaignManagerRulesTests-onDelayedStartupTrigger.json");
const onDelayedStartupTrigger: ISwrveCampaignResourceResponse =
  _onDelayedStartupTrigger as any;
onDelayedStartupTrigger.campaigns.campaigns[0].start_date =
  Date.now() - twoDays;
onDelayedStartupTrigger.campaigns.campaigns[0].end_date = Date.now() + twoDays;

import _passes = require("./resources/json/CampaignManagerRulesTests-passes.json");
const passes: ISwrveCampaignResourceResponse = _passes as any;
passes.campaigns.campaigns[0].start_date = Date.now() - twoDays;
passes.campaigns.campaigns[0].end_date = Date.now() + twoDays;

import _notStarted = require("./resources/json/CampaignManagerRulesTests-notStarted.json");
const notStarted: ISwrveCampaignResourceResponse = _notStarted as any;
notStarted.campaigns.campaigns[0].start_date = Date.now() + twoDays;
notStarted.campaigns.campaigns[0].end_date = Date.now() + twoDays;

import _ended = require("./resources/json/CampaignManagerRulesTests-ended.json");
const ended: ISwrveCampaignResourceResponse = _ended as any;
ended.campaigns.campaigns[0].start_date = Date.now() - twoDays;

import _tooSoonCampaign = require("./resources/json/CampaignManagerRulesTests-tooSoonCampaign.json");
const tooSoonCampaign: ISwrveCampaignResourceResponse = _tooSoonCampaign as any;
tooSoonCampaign.campaigns.campaigns[0].start_date = Date.now() - twoDays;
tooSoonCampaign.campaigns.campaigns[0].end_date = Date.now() + twoDays;

import _tooManyCampaign = require("./resources/json/CampaignManagerRulesTests-tooManyCampaign.json");
const tooManyCampaign: ISwrveCampaignResourceResponse = _tooManyCampaign as any;
tooManyCampaign.campaigns.campaigns[0].start_date = Date.now() - twoDays;
tooManyCampaign.campaigns.campaigns[0].end_date = Date.now() + twoDays;

import _tooSoonSinceLastCampaign = require("./resources/json/CampaignManagerRulesTests-tooSoonSinceLastCampaign.json");
const tooSoonSinceLastCampaign: ISwrveCampaignResourceResponse =
  _tooSoonSinceLastCampaign as any;
tooSoonSinceLastCampaign.campaigns.campaigns[0].start_date =
  Date.now() - twoDays;
tooSoonSinceLastCampaign.campaigns.campaigns[0].end_date = Date.now() + twoDays;
tooSoonSinceLastCampaign.campaigns.campaigns[0].rules.min_delay_between_messages =
  Date.now() + twoDays;

import _tooManyGlobal = require("./resources/json/CampaignManagerRulesTests-tooManyGlobal.json");
const tooManyGlobal: ISwrveCampaignResourceResponse = _tooManyGlobal as any;
tooManyGlobal.campaigns.campaigns[0].start_date = Date.now() - twoDays;
tooManyGlobal.campaigns.campaigns[0].end_date = Date.now() + twoDays;

import _tooSoonGlobal = require("./resources/json/CampaignManagerRulesTests-tooSoonGlobal.json");
const tooSoonGlobal: ISwrveCampaignResourceResponse = _tooSoonGlobal as any;
tooSoonGlobal.campaigns.campaigns[0].start_date = Date.now() - twoDays;
tooSoonGlobal.campaigns.campaigns[0].end_date = Date.now() + twoDays;
tooSoonGlobal.campaigns.campaigns[0].rules.delay_first_message =
  Date.now() + twoDays;
tooSoonGlobal.campaigns.campaigns[0].rules.min_delay_between_messages =
  Date.now() + twoDays;
tooSoonGlobal.campaigns.rules.delay_first_message = Date.now() + twoDays;
tooSoonGlobal.campaigns.rules.min_delay_between_messages = Date.now() + twoDays;

import _tooSoonSinceLastCampaignGlobal = require("./resources/json/CampaignManagerRulesTests-tooSoonSinceLastCampaignGlobal.json");
const tooSoonSinceLastCampaignGlobal: ISwrveCampaignResourceResponse =
  _tooSoonSinceLastCampaignGlobal as any;
tooSoonSinceLastCampaignGlobal.campaigns.campaigns[0].start_date =
  Date.now() - twoDays;
tooSoonSinceLastCampaignGlobal.campaigns.campaigns[0].end_date =
  Date.now() + twoDays;
tooSoonSinceLastCampaignGlobal.campaigns.campaigns[0].rules.min_delay_between_messages =
  Date.now() + twoDays;
tooSoonSinceLastCampaignGlobal.campaigns.rules.min_delay_between_messages =
  Date.now() + twoDays;

import _priorityShowing = require("./resources/json/CampaignManagerRulesTests-priority1And2.json");

const priorityShowing: ISwrveCampaignResourceResponse = _priorityShowing as any;
priorityShowing.campaigns.campaigns[0].start_date = Date.now() - twoDays;
priorityShowing.campaigns.campaigns[0].end_date = Date.now() + twoDays;
priorityShowing.campaigns.campaigns[1].start_date = Date.now() - twoDays;
priorityShowing.campaigns.campaigns[1].end_date = Date.now() + twoDays;

import _priorityEmbeddedAndIAM = require("./resources/json/CampaignManagerRulesTests-priorityEmbeddedIAM.json");
const embeddedAndIAMSharedPriority: ISwrveCampaignResourceResponse =
  _priorityEmbeddedAndIAM as any;
embeddedAndIAMSharedPriority.campaigns.campaigns[0].start_date =
  Date.now() - twoDays;
embeddedAndIAMSharedPriority.campaigns.campaigns[0].end_date =
  Date.now() + twoDays;
embeddedAndIAMSharedPriority.campaigns.campaigns[1].start_date =
  Date.now() - twoDays;
embeddedAndIAMSharedPriority.campaigns.campaigns[1].end_date =
  Date.now() + twoDays;

// setup global variables
let pal = new PlatformMock();
const impressionHandler = (msg: ISwrveMessage) => {};
let user = {
  userId: "SwrveUser",
  sessionToken: "abc",
  nextSeqNum: 1,
  sessionStart: Date.now(),
  isQAUser: false,
  qaUserNextSeqNum: 0,
};

let configInterface = {
  appId: 1111,
  apiKey: "key",
  stack: "us",
  httpsTimeoutSeconds: 1,
  language: "en",
} as ISwrveConfig;

const storageManager = new StorageManager(pal);
let eventFactory = new EventFactory();
let storage = pal.synchronousStorage;

let profileManager = new ProfileManager(
  user.userId,
  1111,
  "key",
  1000,
  storageManager
);

profileManager.setAsQAUser({
  reset_device_state: true,
  logging: true,
});

// end setup

const moveIAMOffscreen = () => {
  const container = document.getElementById(SWRVE_OVERLAY_CONTAINER);

  if (container) {
    container.style.left = "-10000px";
  }
};

const IAMExists = () => {
  const container = document.getElementById(SWRVE_OVERLAY_CONTAINER);
  expect(container).not.toBeNull();
};

jest.spyOn(SwrveCoreSDK, "getPlatform").mockReturnValue(new PlatformMock());

describe("CAMPAIGN MANAGER RULE TESTS", () => {
  beforeEach(function (): void {
    pal = new PlatformMock();
    pal.init([]).then(() => {
      storage = pal.synchronousStorage;
      if (storage) {
        storage.clear();
      }

      user = {
        userId: "SwrveUser",
        sessionToken: "abc",
        nextSeqNum: 1,
        sessionStart: Date.now(),
        isQAUser: false,
        qaUserNextSeqNum: 0,
      };
      eventFactory = new EventFactory();
      profileManager = new ProfileManager(
        user.userId,
        1111,
        "key",
        1000,
        storageManager
      );

      profileManager.setAsQAUser({
        reset_device_state: true,
        logging: true,
      });
    });
  });

  it("Campaign - no triggers match by name", function (done: () => void): void {
    const cm = new CampaignManager(profileManager, pal, storageManager);
    cm.storeCampaigns(noNameMatches, () => {
      const { campaignFailCode } = cm.checkTriggers(
        "tv.event_simple",
        {},
        impressionHandler,
        true
      );
      expect(campaignFailCode).toBe(CAMPAIGN_NO_MATCH);
      done();
    });
  });

  it("Campaign - campaign has not started", function (done: () => void): void {
    let profileManager = new ProfileManager(
      user.userId,
      1111,
      "key",
      1000,
      storageManager
    );

    profileManager.setAsQAUser({
      reset_device_state: true,
      logging: true,
    });

    const cm = new CampaignManager(profileManager, pal, storageManager);

    cm.storeCampaigns(notStarted, () => {
      const { campaignFailCode } = cm.checkTriggers(
        "tv.event_simple",
        {},
        impressionHandler,
        true
      );
      expect(campaignFailCode).toBe(CAMPAIGN_NOT_ACTIVE);
      done();
    });
  });

  it("Campaign - campaign has ended", function (done: () => void): void {
    const cm = new CampaignManager(profileManager, pal, storageManager);

    cm.storeCampaigns(ended, () => {
      const { campaignFailCode } = cm.checkTriggers(
        "tv.event_simple",
        {},
        impressionHandler,
        true
      );
      expect(campaignFailCode).toBe(CAMPAIGN_NOT_ACTIVE);
      done();
    });
  });

  it("Campaign - too soon since startup campaign rule", function (done: () => void): void {
    const cm = new CampaignManager(profileManager, pal, storageManager);

    cm.storeCampaigns(tooSoonCampaign, () => {
      const { campaignFailCode } = cm.checkTriggers(
        "tv.event_simple",
        {},
        impressionHandler,
        true
      );
      expect(campaignFailCode).toBe(CAMPAIGN_THROTTLE_LAUNCH_TIME);
      done();
    });
  });

  it("Campaign - shown too many times campaign", function (done: () => void): void {
    const cm = new CampaignManager(profileManager, pal, storageManager);
    jest
      .spyOn(cm.getAssetManager(), "checkAssetsForCampaign")
      .mockReturnValue(true);

    cm.storeCampaigns(tooManyCampaign, () => {
      cm.checkTriggers("tv.event_simple", {}, impressionHandler, true);
      moveIAMOffscreen();
      IAMExists();

      const { campaignFailCode } = cm.checkTriggers(
        "tv.event_simple",
        {},
        impressionHandler,
        true
      );
      expect(campaignFailCode).toBe(CAMPAIGN_THROTTLE_MAX_IMPRESSIONS);
      done();
    });
  });

  it("Campaign - too soon since last display", function (done: () => void): void {
    const cm = new CampaignManager(profileManager, pal, storageManager);
    jest
      .spyOn(cm.getAssetManager(), "checkAssetsForCampaign")
      .mockReturnValue(true);

    cm.storeCampaigns(tooSoonSinceLastCampaign, () => {
      cm.checkTriggers("tv.event_simple", {}, impressionHandler, true);
      moveIAMOffscreen();

      setTimeout(() => {
        const { campaignFailCode } = cm.checkTriggers(
          "tv.event_simple",
          {},
          impressionHandler,
          true
        );
        moveIAMOffscreen();
        expect(campaignFailCode).toBe(CAMPAIGN_THROTTLE_RECENT);
        done();
      }, 500);
    });
  });

  it("Global = too many shown in session", function (done: () => void): void {
    const cm = new CampaignManager(profileManager, pal, storageManager);
    jest
      .spyOn(cm.getAssetManager(), "checkAssetsForCampaign")
      .mockReturnValue(true);

    cm.storeCampaigns(tooManyGlobal, () => {
      cm.checkTriggers("tv.event_simple", {}, impressionHandler, true);
      moveIAMOffscreen();
      IAMExists();

      const { campaignFailCode } = cm.checkTriggers(
        "tv.event_simple",
        {},
        impressionHandler,
        true
      );
      expect(campaignFailCode).toBe(GLOBAL_CAMPAIGN_THROTTLE_MAX_IMPRESSIONS);
      done();
    });
  });

  it("Global - too soon from session start", function (done: () => void): void {
    SwrveLogger.info("************************************** TEST B");
    const cm = new CampaignManager(profileManager, pal, storageManager);
    jest
      .spyOn(cm.getAssetManager(), "checkAssetsForCampaign")
      .mockReturnValue(true);

    cm.storeCampaigns(tooSoonGlobal, () => {
      const { campaignFailCode } = cm.checkTriggers(
        "tv.event_simple",
        {},
        impressionHandler,
        true
      );
      expect(campaignFailCode).toBe(GLOBAL_CAMPAIGN_THROTTLE_LAUNCH_TIME);
      done();
    });
  });

  it("Global - too soon since last display", function (done: () => void): void {
    const cm = new CampaignManager(profileManager, pal, storageManager);
    jest
      .spyOn(cm.getAssetManager(), "checkAssetsForCampaign")
      .mockReturnValue(true);

    cm.storeCampaigns(tooSoonSinceLastCampaignGlobal, () => {
      cm.checkTriggers("tv.event_simple", {}, impressionHandler, true);
      moveIAMOffscreen();

      setTimeout(() => {
        const { campaignFailCode } = cm.checkTriggers(
          "tv.event_simple",
          {},
          impressionHandler,
          true
        );
        moveIAMOffscreen();
        expect(campaignFailCode).toBe(GLOBAL_CAMPAIGN_THROTTLE_RECENT);
        done();
      }, 500);
    });
  });

  it("handles multiple matching campaigns", function (done: () => void): void {
    const cm = new CampaignManager(profileManager, pal, storageManager);
    jest
      .spyOn(cm.getAssetManager(), "checkAssetsForCampaign")
      .mockReturnValue(true);

    cm.storeCampaigns(multipleMatches, () => {
      const { campaignFailCode, campaigns } = cm.checkTriggers(
        "tv.event_simple",
        {},
        impressionHandler,
        true
      );
      expect(campaignFailCode).toBe(CAMPAIGN_MATCH);
      expect(campaigns.length).toBe(2);
      done();
    });
  });

  it("shows priority 1 campaign once, then shows priority 2 campaign", function (done: () => void): void {
    const cm = new CampaignManager(profileManager, pal, storageManager);
    jest
      .spyOn(cm.getAssetManager(), "checkAssetsForCampaign")
      .mockReturnValue(true);

    cm.storeCampaigns(priorityShowing, () => {
      cm.checkTriggers("tv.event_simple", {}, impressionHandler, true);
      moveIAMOffscreen();

      let container = document.getElementById(SWRVE_IAM_CONTAINER);
      expect(container!.className).toBe("IAM1");
      cm.closeMessage();

      cm.checkTriggers("tv.event_simple", {}, impressionHandler, true);
      container = document.getElementById(SWRVE_IAM_CONTAINER);
      moveIAMOffscreen();

      expect(container!.className).toBe("IAM2");
      cm.closeMessage();

      done();
    });
  });

  it("shares the same priority queue between IAM and embedded", function (done: () => void): void {
    const cm = new CampaignManager(profileManager, pal, storageManager);
    jest
      .spyOn(cm.getAssetManager(), "checkAssetsForCampaign")
      .mockReturnValue(true);

    const mockEmbeddedCallback = jest.fn();
    cm.onEmbeddedMessage(mockEmbeddedCallback);

    cm.storeCampaigns(embeddedAndIAMSharedPriority, () => {
      cm.checkTriggers("tv.event_simple", {}, impressionHandler, true);
      moveIAMOffscreen();

      let container = document.getElementById(SWRVE_IAM_CONTAINER);
      expect(container!.className).toBe("IAM1");
      cm.closeMessage();

      expect(mockEmbeddedCallback.mock.calls.length).toBe(0);

      cm.checkTriggers("tv.event_simple", {}, impressionHandler, true);
      expect(mockEmbeddedCallback.mock.calls.length).toBe(1);
      const embeddedMessage = mockEmbeddedCallback.mock
        .calls[0][0] as ISwrveEmbeddedMessage;
      expect(embeddedMessage.data).toBe(
        "This data is of string format or really anything"
      );
      done();
    });
  });

  it("passes all tests and is triggered!", function (done: () => void): void {
    const cm = new CampaignManager(profileManager, pal, storageManager);
    jest
      .spyOn(cm.getAssetManager(), "checkAssetsForCampaign")
      .mockReturnValue(true);

    cm.storeCampaigns(passes, () => {
      const { campaignFailCode } = cm.checkTriggers(
        "tv.event_simple",
        {},
        impressionHandler,
        true
      );
      expect(campaignFailCode).toBe(CAMPAIGN_MATCH);
      moveIAMOffscreen();
      done();
    });
  });

  it("calls back to installed messageListener", function (done: () => void): void {
    const cm = new CampaignManager(profileManager, pal, storageManager);
    jest
      .spyOn(cm.getAssetManager(), "checkAssetsForCampaign")
      .mockReturnValue(true);

    cm.storeCampaigns(passes, () => {
      cm.checkTriggers("tv.event_simple", {}, impressionHandler, true);
      moveIAMOffscreen();
    });
    cm.onMessage((msg: ISwrveMessage) => {
      expect(msg.id).toEqual(317653);
      done();
    });
  });

  it("triggers on startup", function (done: () => void): void {
    const restClient = new MockSwrveRestClient();
    restClient.changeResponse({ json: () => onStartupTrigger });
    const config = new SwrveConfig(configInterface);

    const eventManager = new EventManager(
      restClient,
      storageManager,
      config,
      profileManager,
      pal.deviceID
    );
    const queue: SwrveEvent[] = [];
    eventManager.queueEvent = (evt) => {
      queue.push(evt);
      EventManager.prototype.queueEvent.call(eventManager, evt);
    };

    const iamContainer = document.getElementById(SWRVE_OVERLAY_CONTAINER);
    if (iamContainer) {
      document.body.removeChild(iamContainer);
    }

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { eventManager, restClient, platform: pal }
    );
    sdk.init();

    setTimeout(() => {
      const impressionEvents = queue.filter(
        (evt) => evt.type === "event" && evt.name.match(/\.impression$/)
      );
      expect(impressionEvents.length).toBeGreaterThan(0);
      expect(sdk["autoShowEnabled"]).toBe(false);
      IAMExists();
      moveIAMOffscreen();
      sdk.shutdown();
      done();
    }, 1800);
  });

  it("doesn't trigger on startup due to timeout", function (done: () => void): void {
    const restClient = new MockSwrveRestClient();
    restClient.changeResponse({ json: () => onDelayedStartupTrigger }, 1000);
    const config = new SwrveConfig(configInterface);

    const eventManager = new EventManager(
      restClient,
      storageManager,
      config,
      profileManager,
      pal.deviceID
    );

    const iamContainer = document.getElementById("SwrveIAMContainer");
    if (iamContainer) {
      document.body.removeChild(iamContainer);
    }

    const sdk = new Swrve(
      {
        appId: 30512,
        apiKey: "1234",
        inAppMessageConfig: { autoShowMessagesMaxDelay: 0 },
      },
      { eventManager, restClient, platform: pal }
    );
    sdk.init();
    expect(sdk["autoShowEnabled"]).toBe(true);

    setTimeout(() => {
      const queue = eventManager.getQueue();
      const impressionEvents = queue.filter(
        (evt) => evt.type === "event" && evt.name.match(/\.impression$/)
      );

      expect(impressionEvents.length).toEqual(0);
      expect(sdk["autoShowEnabled"]).toBe(false);
      sdk.shutdown();
      done();
    }, 1200);
  });

  afterEach(function (): void {
    const storage = pal.synchronousStorage;
    if (storage) {
      storage.clear();
    } else {
      SwrveLogger.error("No Local Storage");
    }

    const container = document.getElementById(SWRVE_OVERLAY_CONTAINER);
    if (container) {
      document.body.removeChild(container);
    }
  });
});
