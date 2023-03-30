import PAL from "../src/utils/PAL";
import { Swrve } from "../src/Swrve";
import { SwrveCoreSDK } from "../src/SwrveCoreSDK";
import { MockSwrveRestClient } from "./mocks/MockSwrveRestClient";
import {
  ISwrveCampaignResourceResponse,
  ISwrveEmbeddedMessage,
} from "../src/interfaces/ISwrveCampaign";
import { APP_ID_ERROR, CAMPAIGN_MATCH } from "../src/utils/SwrveConstants";
import { parseUuid } from "../src/utils/uuid";
import IRestResponse from "../src/interfaces/IRestResponse";
import { IQueryParams } from "../src/interfaces/IQueryParams";
import IResourceDiff from "../src/interfaces/IResourceDiff";
import {
  ISwrveConfig,
  ISwrveEmbeddedMessageConfig,
  ISwrveWebPushConfig,
} from "../src/interfaces/ISwrveConfig";
import { IQANamedEvent } from "../src/interfaces/IQAEvents";

const twoDays = 172800000;

import _passes = require("./resources/json/SwrveSDKTests-passes.json");
const passes: ISwrveCampaignResourceResponse = _passes as any;
passes.campaigns.campaigns[0].start_date = Date.now() - twoDays;
passes.campaigns.campaigns[0].end_date = Date.now() + twoDays;

import _impDiffJson = require("./resources/json/SwrveSDKTests-diffJson.json");
const impDiffJson: ReadonlyArray<IResourceDiff> = _impDiffJson as any;

import _qaUser = require("./resources/json/SwrveSDKTests-qaUser.json");
const qaUser: ISwrveCampaignResourceResponse = _qaUser as any;

import _noQAUser = require("./resources/json/SwrveSDKTests-noQAUser.json");
const noQAUser: ISwrveCampaignResourceResponse = _noQAUser as any;

import _webPushKey = require("./resources/json/SwrveSDKTests-webPushKey.json");
const webPushKey: ISwrveCampaignResourceResponse = _webPushKey as any;

import _embeddedMessageTriggered = require("./resources/json/SwrveSDKTests-embeddedMessageTriggered.json");
const embeddedMessageTriggered: ISwrveCampaignResourceResponse =
  _embeddedMessageTriggered as any;
embeddedMessageTriggered.campaigns.campaigns[0].start_date =
  Date.now() - twoDays;
embeddedMessageTriggered.campaigns.campaigns[0].end_date = Date.now() + twoDays;

import _embeddedMessageMC = require("./resources/json/SwrveSDKTests-embeddedMessageCenter.json");
const embeddedMessageMC: ISwrveCampaignResourceResponse =
  _embeddedMessageMC as any;
embeddedMessageMC.campaigns.campaigns[0].start_date = Date.now() - twoDays;
embeddedMessageMC.campaigns.campaigns[0].end_date = Date.now() + twoDays;

import _realTimeUserProps = require("./resources/json/SwrveSDKTests-realTimeUserProperties.json");
const realTimeUserProps: ISwrveCampaignResourceResponse =
  _realTimeUserProps as any;

const resourcesCDNRoot = {
  campaigns: { cdn_root: "cdnRoot" },
};

import resources = require("./resources/json/SwrveSDKTests-resources.json");
import PlatformMock from "./mocks/PlatformMock";
import { SWRVE_USER_ID } from "../src/utils/SwrveConstants";
import IDictionary from "../src/interfaces/IDictionary";
import DateHelper from "../src/utils/DateHelper";

const pal = new PlatformMock();

jest.spyOn(SwrveCoreSDK, "getPlatform").mockReturnValue(pal);

describe("SWRVE SDK TESTS", () => {
  const restClient = new MockSwrveRestClient();
  it("is a singleton", () => {
    restClient.changeResponse({ json: () => passes });

    SwrveCoreSDK.createInstance(
      { appId: 1111, apiKey: "1234" },
      { restClient, platform: pal }
    );
    const instance1 = SwrveCoreSDK.getInstance();

    SwrveCoreSDK.createInstance(
      { appId: 1111, apiKey: "1234" },
      { restClient, platform: pal }
    );
    const instance2 = SwrveCoreSDK.getInstance();

    expect(instance1).toEqual(instance2);

    SwrveCoreSDK.shutdown();
  });

  it("generates userId when missing and reuses it next time", () => {
    pal.synchronousStorage!.clear();
    restClient.changeResponse({ json: () => passes });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();

    expect(sdk.getUserId()).not.toBe("");
    const uuid = parseUuid(sdk.getUserId());
    expect(uuid.toString()).toBe(sdk.getUserId());

    sdk.shutdown();

    const sdk2 = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk2.init();

    expect(sdk2.getUserId()).toBe(uuid.toString());

    sdk2.shutdown();
  });

  it("generates userId and reuses it next time", () => {
    restClient.changeResponse({ json: () => passes });
    pal.synchronousStorage!.clear();

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();

    const uuid = parseUuid(sdk.getUserId());
    expect(uuid.toString()).toBe(sdk.getUserId());

    sdk.shutdown();

    const sdk2 = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk2.init();
    expect(uuid.toString()).toBe(sdk2.getUserId());
    sdk2.shutdown();
  });

  it("calls onSwrveCoreReadyCallback if set", (done) => {
    restClient.changeResponse({ json: () => passes });
    pal.synchronousStorage!.clear();

    const callback = jest.fn();

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init(callback);

    setTimeout(() => {
      expect(callback.mock.calls.length).toBe(1);
      done();
    }, 500);
  });

  it("generate first Use timestamp ", () => {
    const expectedDate = new Date("2019-04-07T10:20:30Z").getTime();

    DateHelper.nowInUtcTime = jest.fn(() => expectedDate);
    restClient.changeResponse({ json: () => passes });
    pal.synchronousStorage!.clear();

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();

    const profileManager = sdk["profileManager"];
    expect(profileManager.currentUser.firstUse).not.toBe(0);
    expect(profileManager.currentUser.firstUse).toBe(expectedDate);
  });

  it("queue named Event - success", (done) => {
    const restClient = new MockSwrveRestClient();

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();
    sdk.event("successTest", { type: "test", amount: 4 });
    sdk.sendQueuedEvents();

    setTimeout(() => {
      const eventManager = sdk["evtManager"];
      const namedEvents = eventManager
        .getQueue()
        .filter((event) => event.type === "event");
      expect(namedEvents).toHaveLength(0);
      sdk.shutdown();
      done();
    }, 1500);
  });

  it("queue named Event - fail", (done) => {
    pal.synchronousStorage!.clear();
    restClient.changeResponse({ status: 400 });
    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );

    sdk.init();
    sdk.event("failTest", { type: "test", amount: 4 });

    setTimeout(() => {
      const que = sdk.getQueuedEvents();
      expect(que.length).toBe(2); //fail test and device properties
      sdk.shutdown();
      done();
    }, 1500);

    // teardown
    restClient.changeResponse({ status: 200 });
  });

  it("flushFrequency gets set", (done) => {
    pal.synchronousStorage!.clear();
    var responseObject = {
      flush_frequency: 4000,
      flush_refresh_delay: 1000,
    };
    restClient.changeResponse({ json: () => responseObject });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();

    setTimeout(() => {
      expect(sdk["flushFrequency"]).toBe(4000);
      sdk.shutdown();
      done();
    }, 1000);
  });

  it("getContentRequestParams has correct values", (done) => {
    restClient.changeResponse({ json: () => passes });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();

    setTimeout(() => {
      const contentParams: IQueryParams = sdk.getContentRequestParams();

      // should be taking from platform / starting config
      expect(contentParams.api_key).toBe("1234");
      expect(contentParams.user).toBe(
        pal.synchronousStorage.getItem(SWRVE_USER_ID)
      );
      expect(contentParams.app_version).toBe("1.0");
      expect(contentParams.app_store).toBe(pal.appStore);
      expect(contentParams.joined).toBeDefined();
      expect(contentParams.language).toBe(pal.language);
      expect(contentParams.device_width).toBe("" + pal.screenWidth);
      expect(contentParams.device_height).toBe("" + pal.screenHeight);
      expect(contentParams.device_dpi).toBe("" + pal.screenDPI);
      expect(contentParams.device_name).toBe(pal.deviceName);
      expect(contentParams.os_version).toBe(pal.osVersion);
      expect(contentParams.os).toBe(pal.os);
      expect(contentParams.device_type).toBe(pal.deviceType);
      expect(contentParams.orientation).toBe("landscape");

      // version numbers for Swrve backend items
      expect(contentParams.version).toBe("8");
      expect(contentParams.embedded_campaign_version).toBe("1");

      done();
    }, 1000);
  });

  it("Resource callback works as expected", (done) => {
    restClient.changeResponse({ json: () => resources });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();

    sdk.onResourcesLoaded((resources) => {
      if (resources) {
        expect(resources.length).toBe(13);
        expect(resources[0].name).toBe("tv.demoapp.main.scene");
      } else {
        fail();
      }
      sdk.shutdown();
      done();
    });
  });

  it("campaign callback works as expected", (done) => {
    restClient.changeResponse({ json: () => resources });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();

    sdk.onCampaignLoaded(() => {
      sdk.shutdown();
      done();
    });
  });

  it("stores CDN from cdn_paths", (done) => {
    restClient.changeResponse({ json: () => resources });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();

    setTimeout(() => {
      const campaignManager = sdk["campaignManager"];
      const assetsManager = campaignManager.getAssetManager();
      const cdnImages = assetsManager.ImagesCDN;
      const fontCDN = assetsManager.FontsCDN;
      expect(cdnImages).toBe("image string");
      expect(fontCDN).toBe("font string");
      done();
    }, 400);
  });

  it("stores CDN from cdn_root", (done) => {
    restClient.changeResponse({ json: () => resourcesCDNRoot });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();

    setTimeout(() => {
      const campaignManager = sdk["campaignManager"];
      const assetsManager = campaignManager.getAssetManager();
      const cdnImages = assetsManager.ImagesCDN;
      expect(cdnImages).toBe("cdnRoot");

      done();
    }, 400);
  });

  it("clears CDN if data changes", (done) => {
    restClient.changeResponse({ json: () => resources });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();

    setTimeout(() => {
      const campaignManager = sdk["campaignManager"];
      const assetsManager = campaignManager.getAssetManager();
      const cdnImages = assetsManager.ImagesCDN;
      expect(cdnImages).toBe("image string");

      restClient.changeResponse({ json: () => resourcesCDNRoot });

      sdk.updateCampaignsAndResources();

      setTimeout(() => {
        const campaignManager = sdk["campaignManager"];
        const assetsManager = campaignManager.getAssetManager();
        const cdnImages = assetsManager.ImagesCDN;
        const fontCDN = assetsManager.FontsCDN;
        expect(cdnImages).toBe("cdnRoot");
        expect(fontCDN).toBe("");
        done();
      }, 400);
    }, 400);
  });

  it("getUserResourcesDiff returns data via callback", (done) => {
    pal.synchronousStorage!.clear();
    restClient.changeResponse({ json: () => impDiffJson });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );

    sdk.init();
    setTimeout(() => {
      sdk.getUserResourcesDiff(
        (oldDictionary: any, newDictionary: any, json: any) => {
          expect(oldDictionary).toEqual({
            "simpleevent.scene": {
              "background.color": "#000000",
              "text.color": "#FFFFFF",
              "text.size": "12",
              "title.label": "Simple Event",
            },
            "media.scene": {
              "body.label":
                "This is the page that plays a movie trailer and allows the user to watch and mark as favourites",
              "video.url": "http://url_link",
            },
          });
          expect(newDictionary).toEqual({
            "simpleevent.scene": {
              "background.color": "#ff0000",
              "text.color": "#00ff00",
              "text.size": "16",
              "title.label": "Simple Event _Treat1",
            },
            "media.scene": {
              "body.label": "This is a different video of rabbits",
              "video.url":
                "http://test.url.rabbits/c7fc2c1f-0d06-4d41-bc96-596f15a739bf",
            },
          });
          expect(json).toEqual(impDiffJson);
          done();
        }
      );
    }, 400);
  });

  it("getUserResourcesDiff returns stored data on network error", (done) => {
    pal.synchronousStorage!.clear();

    const diffJson = [
      {
        uid: "1",
        item_class: "",
        diff: {
          a: {
            old: "old-a",
            new: "new-a",
          },
          b: {
            old: "old-b",
            new: "new-b",
          },
        },
      },
    ];
    const oldDictionaryJson = {
      1: {
        a: "old-a",
        b: "old-b",
      },
    };
    const newDictionaryJson = {
      1: {
        a: "new-a",
        b: "new-b",
      },
    };

    restClient.changeResponse({ json: () => diffJson });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );

    sdk.init();
    setTimeout(() => {
      sdk.getUserResourcesDiff(
        (oldDictionary: any, newDictionary: any, json: any) => {
          expect(oldDictionary).toEqual(oldDictionaryJson);
          expect(newDictionary).toEqual(newDictionaryJson);
          expect(json).toEqual(diffJson);
          sdk.getUserResourcesDiff(
            (oldDictionary: any, newDictionary: any, json: any) => {
              expect(oldDictionary).toEqual(oldDictionaryJson);
              expect(newDictionary).toEqual(newDictionaryJson);
              expect(json).toEqual(diffJson);
              done();
            }
          );
        }
      );
    }, 400);
  });

  it("getUserResourcesDiff returns empty values on network error and when no data stored", (done) => {
    PAL.getPlatform().synchronousStorage!.clear();

    restClient.changeResponse({ status: 400 });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );

    sdk.getUserResourcesDiff(
      (oldDictionary: any, newDictionary: any, json: any) => {
        expect(oldDictionary).toEqual({});
        expect(newDictionary).toEqual({});
        expect(json).toEqual([]);
        done();
      }
    );
  });

  it("Queues a campaigns downloaded qa event if QA user", (done) => {
    restClient.changeResponse({ json: () => qaUser });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();

    setTimeout(() => {
      const queue = sdk.getQALogging().getQueue();
      const campaignsDownloadedEvents = queue.filter(
        (evt) =>
          evt.type === "qa_log_event" && evt.log_type === "campaigns-downloaded"
      );
      expect(campaignsDownloadedEvents.length).toBe(1);
      done();
    }, 400);
  });

  it("Does not queue a campaigns downloaded event if not a QA user", (done) => {
    restClient.changeResponse({ json: () => noQAUser });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();

    setTimeout(() => {
      const queue = sdk.getQALogging().getQueue();
      const campaignsDownloadedEvents = queue.filter(
        (evt) =>
          evt.type === "qa_log_event" && evt.log_type === "campaigns-downloaded"
      );
      expect(campaignsDownloadedEvents.length).toEqual(0);
      done();
    }, 400);
  });

  it("Stop works", (done) => {
    restClient.changeResponse({ json: () => noQAUser });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();

    setTimeout(() => {
      const queueEvent = jest.fn();
      const evtMgr = sdk["evtManager"];
      evtMgr.queueEvent = queueEvent;
      sdk.stop();

      sdk.event("test", {});
      sdk.iap(1, "sword", 5, "gold");
      sdk.userUpdate({ name: "test" });
      sdk.userUpdateWithDate("test", new Date());
      sdk.currencyGiven("gold", 10);
      sdk.purchase("sword", "gold", 10, 10);

      expect(sdk["pauseSDK"]).toBeTruthy();
      expect(queueEvent.mock.calls.length).toBe(0);
      expect(sdk["eventLoopTimer"]).toBe(0);

      done();
    }, 1000);
  });

  it("SDK restarts", (done) => {
    restClient.changeResponse({ json: () => noQAUser });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();

    setTimeout(() => {
      const queueEvent = jest.fn();
      const evtMgr = sdk["evtManager"];

      evtMgr.queueEvent = queueEvent;
      sdk.sendQueuedEvents();
      sdk.stop();

      expect(sdk["pauseSDK"]).toBeTruthy;

      sdk.identify("", () => {}, () => {});
      sdk.event("test", {});
      sdk.iap(1, "sword", 5, "gold");
      sdk.userUpdate({ name: "test" });
      sdk.userUpdateWithDate("test", new Date());
      sdk.currencyGiven("gold", 10);
      sdk.purchase("sword", "gold", 10, 10);

      expect(sdk["pauseSDK"]).toBeFalsy;
      expect(queueEvent.mock.calls.length).toBeGreaterThan(6);
      expect(sdk["eventLoopTimer"]).toBeGreaterThan(0);

      done();
    }, 1000);
  });

  it("QA User queues to qaLogging as well as standard", (done) => {
    restClient.changeResponse({ json: () => qaUser });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();

    setTimeout(() => {
      const queueEvent = jest.fn();
      const evtMgr = sdk["evtManager"];
      evtMgr.queueEvent = queueEvent;

      sdk.event("test", {});
      sdk.iap(1, "sword", 5, "gold");
      sdk.userUpdate({ name: "test" });
      sdk.userUpdateWithDate("test", new Date());
      sdk.currencyGiven("gold", 10);
      sdk.purchase("sword", "gold", 10, 10);

      const qaQueue = sdk.getQALogging().getQueue();
      expect(queueEvent.mock.calls.length).toBe(6);
      // there will be more than 6 due to specific QA events.
      expect(qaQueue.length).toBeGreaterThan(6);

      done();
    }, 1000);
  });

  it("webApiKeyCallback fires in the presence of a web notification key", (done) => {
    pal.synchronousStorage!.clear();
    restClient.changeResponse({ json: () => webPushKey });

    let testPushKey: string;
    let isAutoPushSubscribe: boolean;

    const webApiKeyCallback = (key: string, autoSubscribe: boolean) => {
      testPushKey = key;
      isAutoPushSubscribe = autoSubscribe;
    };

    var pushConfig = {
      webApiKeyCallback,
      autoPushSubscribe: true,
    } as ISwrveWebPushConfig;

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234", webPushConfig: pushConfig },
      { restClient, platform: pal }
    );

    sdk.init();
    setTimeout(() => {
      expect(testPushKey).toBe("test_push_key");
      expect(isAutoPushSubscribe).toBeTruthy();

      done();
    }, 100);
  });

  it("webApiKeyCallback fires in the presence of a web notification key", (done) => {
    pal.synchronousStorage!.clear();
    restClient.changeResponse({ json: () => webPushKey });

    let testPushKey: string;
    let isAutoPushSubscribe: boolean;

    const webApiKeyCallback = (key: string, autoSubscribe: boolean) => {
      testPushKey = key;
      isAutoPushSubscribe = autoSubscribe;
    };

    var pushConfig = {
      webApiKeyCallback,
      autoPushSubscribe: true,
    } as ISwrveWebPushConfig;

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234", webPushConfig: pushConfig },
      { restClient, platform: pal }
    );

    sdk.init();
    setTimeout(() => {
      expect(testPushKey).toBe("test_push_key");
      expect(isAutoPushSubscribe).toBeTruthy();
      done();
    }, 100);
  });

  it("Notification Delivery and Engagement Events queue correctly", (done) => {
    restClient.changeResponse({ json: () => qaUser });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();

    setTimeout(() => {
      // send both of the QA events
      sdk.notificationDeliveredEvent(1);
      sdk.notificationEngagedEvent(1);

      const eventQueue = sdk.getQueuedEvents();
      const qaQueue = sdk.getQALogging().getQueue();

      expect(eventQueue.length).toBe(3);
      expect(qaQueue.length).toBe(4);

      const deliveredEvents = eventQueue.filter(
        (evt) =>
          evt.type === "event" && evt.name === "Swrve.Messages.Push-1.delivered"
      );
      expect(deliveredEvents.length).toBe(1);

      const deliveredQAEvents = qaQueue.filter(
        (evt) =>
          evt.type === "qa_log_event" &&
          JSON.stringify(evt.log_details).indexOf(
            "Swrve.Messages.Push-1.delivered"
          ) !== -1
      );
      expect(deliveredQAEvents.length).toBe(1);

      const engagedEvents = eventQueue.filter(
        (evt) =>
          evt.type === "event" && evt.name === "Swrve.Messages.Push-1.engaged"
      );
      expect(engagedEvents.length).toBe(1);

      const engagedQAEvents = qaQueue.filter(
        (evt) =>
          evt.type === "qa_log_event" &&
          JSON.stringify(evt.log_details).indexOf(
            "Swrve.Messages.Push-1.engaged"
          ) !== -1
      );
      expect(engagedQAEvents.length).toBe(1);

      done();
    }, 1000);
  });

  it("Embedded Campaign callback API in config was fired on trigger", (done) => {
    restClient.changeResponse({ json: () => embeddedMessageTriggered });

    const embeddedCallback = jest.fn();
    const embeddedMessageConfig = {
      embeddedCallback,
    } as ISwrveEmbeddedMessageConfig;

    const sdk = new Swrve(
      {
        appId: 30512,
        apiKey: "1234",
        embeddedMessageConfig,
      },
      { restClient, platform: pal }
    );

    // Mock passing global rules
    const cm = sdk["campaignManager"];
    const mockedApplyGlobalRules = jest.spyOn(cm as any, "applyGlobalRules");
    mockedApplyGlobalRules.mockImplementation(() => {
      return {
        status: CAMPAIGN_MATCH,
        message: "Campaign 315415 passes display rules",
      };
    });

    const applyCampaignRules = jest.spyOn(cm as any, "applyCampaignRules");
    applyCampaignRules.mockImplementation(() => {
      return {
        status: CAMPAIGN_MATCH,
        message: "Campaign 315415 passes display rules",
      };
    });

    sdk.init();

    setTimeout(() => {
      var embeddedConfig = sdk.getConfig().embeddedMessageConfig;
      expect(embeddedConfig).toBeDefined();

      sdk.event("embedded.trigger", {});

      expect(embeddedCallback.mock.calls.length).toBe(1);

      const embeddedMessage = embeddedCallback.mock
        .calls[0][0] as ISwrveEmbeddedMessage;
      expect(embeddedMessage.id).toBe(527804);
      expect(embeddedMessage.name).toBe("Embedded triggered Campaign Test");
      expect(embeddedMessage.data).toBe(
        "This data is of string format or really anything"
      );
      expect(embeddedMessage.type).toBe("other");
      expect(embeddedMessage.buttons.length).toBe(2);
      expect(embeddedMessage.priority).toBe(9999);
      expect(embeddedMessage.parentCampaign).toBe(315415);

      const embeddedPersonalizationArg = embeddedCallback.mock
        .calls[0][1] as IDictionary<string>;
      expect(embeddedPersonalizationArg["user.testkey"]).toBe("testvalue");
      expect(embeddedPersonalizationArg["user.author"]).toBe("adam");

      done();
    }, 1000);
  });

  it("Embedded Campaign callback API in config was fired on messageCenter", (done) => {
    restClient.changeResponse({ json: () => embeddedMessageMC });

    const embeddedCallback = jest.fn();
    const embeddedMessageConfig = {
      embeddedCallback,
    } as ISwrveEmbeddedMessageConfig;

    const sdk = new Swrve(
      {
        appId: 30512,
        apiKey: "1234",
        embeddedMessageConfig,
      },
      { restClient, platform: pal }
    );

    sdk.init();

    setTimeout(() => {
      var embeddedConfig = sdk.getConfig().embeddedMessageConfig;
      expect(embeddedConfig).toBeDefined();

      const localProperties = {
        "user.author": "thomas",
      } as IDictionary<string>;
      const mc = sdk.getMessageCenterCampaigns(localProperties);
      expect(mc.length).toBe(1);

      sdk.showCampaign(mc[0], localProperties);

      expect(embeddedCallback.mock.calls.length).toBe(1);

      const embeddedMessage = embeddedCallback.mock
        .calls[0][0] as ISwrveEmbeddedMessage;
      expect(embeddedMessage.id).toBe(512345);
      expect(embeddedMessage.name).toBe("Embedded MessageCenter Campaign Test");
      expect(embeddedMessage.data).toBe('{"test": "json_payload"}');
      expect(embeddedMessage.type).toBe("json");
      expect(embeddedMessage.buttons.length).toBe(0);
      expect(embeddedMessage.priority).toBe(9999);
      expect(embeddedMessage.parentCampaign).toBe(312345);

      // Real Time User Properties are included and modified by localProperties
      const embeddedPersonalizationArg = embeddedCallback.mock
        .calls[0][1] as IDictionary<string>;
      expect(embeddedPersonalizationArg["user.testkey"]).toBe("testvalue");
      expect(embeddedPersonalizationArg["user.author"]).toBe("thomas");

      done();
    }, 1000);
  });

  it("Embedded Campaign Trigger will still trigger personalizationProvider", (done) => {
    restClient.changeResponse({ json: () => embeddedMessageTriggered });

    const personalizationProvider = (
      eventPayload: IDictionary<string>
    ): IDictionary<string> => {
      
      expect(eventPayload).toBeDefined();
      return eventPayload;
    };

    const embeddedCallback = jest.fn();
    const embeddedMessageConfig = {
      embeddedCallback,
    } as ISwrveEmbeddedMessageConfig;

    const sdk = new Swrve(
      {
        appId: 30512,
        apiKey: "1234",
        embeddedMessageConfig,
        personalizationProvider
      },
      { restClient, platform: pal }
    );

    // Mock passing global rules
    const cm = sdk["campaignManager"];
    const mockedApplyGlobalRules = jest.spyOn(cm as any, "applyGlobalRules");
    mockedApplyGlobalRules.mockImplementation(() => {
      return {
        status: CAMPAIGN_MATCH,
        message: "Campaign 315415 passes display rules",
      };
    });

    const applyCampaignRules = jest.spyOn(cm as any, "applyCampaignRules");
    applyCampaignRules.mockImplementation(() => {
      return {
        status: CAMPAIGN_MATCH,
        message: "Campaign 315415 passes display rules",
      };
    });

    sdk.init();

    setTimeout(() => {
      var embeddedConfig = sdk.getConfig().embeddedMessageConfig;
      expect(embeddedConfig).toBeDefined();

      sdk.event("embedded.trigger", {"payload_key": "payload_value"});

      expect(embeddedCallback.mock.calls.length).toBe(1);

      const embeddedMessage = embeddedCallback.mock
        .calls[0][0] as ISwrveEmbeddedMessage;
      expect(embeddedMessage.id).toBe(527804);
      expect(embeddedMessage.name).toBe("Embedded triggered Campaign Test");
      expect(embeddedMessage.data).toBe(
        "This data is of string format or really anything"
      );
      expect(embeddedMessage.type).toBe("other");
      expect(embeddedMessage.buttons.length).toBe(2);
      expect(embeddedMessage.priority).toBe(9999);
      expect(embeddedMessage.parentCampaign).toBe(315415);

      const embeddedPersonalizationArg = embeddedCallback.mock
        .calls[0][1] as IDictionary<string>;
      expect(embeddedPersonalizationArg["user.testkey"]).toBe("testvalue");
      expect(embeddedPersonalizationArg["user.author"]).toBe("adam");
      expect(embeddedPersonalizationArg["payload_key"]).toBe("payload_value");

      done();
    }, 1000);
  });

  it("Embedded Campaign Impression / Interaction events queue correctly", (done) => {
    restClient.changeResponse({ json: () => qaUser });
    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();

    setTimeout(() => {
      const testEmbeddedMessage = {
        data: "test data",
        buttons: ["button1"] as ReadonlyArray<string>,
        type: "other",
        id: 1,
        priority: 2,
        name: "parent campaign",
        rules: { orientations: "landscape" },
        parentCampaign: 22,
      } as ISwrveEmbeddedMessage;

      // send both of the QA events
      sdk.embeddedMessageWasShownToUser(testEmbeddedMessage);
      sdk.embeddedMessageButtonWasPressed(testEmbeddedMessage, "button1");

      const eventQueue = sdk.getQueuedEvents();
      const qaQueue = sdk.getQALogging().getQueue();

      expect(eventQueue.length).toBe(3);
      expect(qaQueue.length).toBe(4);

      const impressionEvents = eventQueue.filter(
        (evt) =>
          evt.type === "event" &&
          evt.name === "Swrve.Messages.Message-1.impression" &&
          evt.payload!.embedded === "true"
      );
      expect(impressionEvents.length).toBe(1);

      const impressionQAEvents = qaQueue.filter(
        (evt) =>
          evt.type === "qa_log_event" &&
          JSON.stringify(evt.log_details).indexOf(
            "Swrve.Messages.Message-1.impression"
          ) !== -1
      );
      expect(impressionQAEvents.length).toBe(1);

      const engagedEvents = eventQueue.filter(
        (evt) =>
          evt.type === "event" &&
          evt.name === "Swrve.Messages.Message-1.click" &&
          evt.payload!.embedded === "true"
      );
      expect(engagedEvents.length).toBe(1);

      const engagedQAEvents = qaQueue.filter(
        (evt) =>
          evt.type === "qa_log_event" &&
          JSON.stringify(evt.log_details).indexOf(
            "Swrve.Messages.Message-1.click"
          ) !== -1
      );
      expect(engagedQAEvents.length).toBe(1);

      done();
    }, 1000);
  });

  it("Real Time User properties are processed and merged correctly", (done) => {
    restClient.changeResponse({ json: () => realTimeUserProps });

    const personalizationProvider = (
      eventPayload: IDictionary<string>
    ): IDictionary<string> => {
      let payload = eventPayload;
      payload["test"] = "passed";
      return payload;
    };

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234", personalizationProvider },
      { restClient, platform: pal }
    );
    sdk.init();

    setTimeout(() => {
      expect(sdk.getRealTimeUserProperties()).toEqual(
        realTimeUserProps.real_time_user_properties
      );

      // from a message center campaign, the properties are populated
      var result = sdk.retrievePersonalizationProperties(
        {},
        { "user.author": "thomas" }
      );
      expect(result["user.testkey"]).toBe("testvalue");
      expect(result["user.author"]).toBe("thomas");

      // from a triggered campaign
      result = sdk.retrievePersonalizationProperties(
        { passed: "event_payload" },
        {}
      );
      expect(result["user.testkey"]).toBe("testvalue");
      expect(result["user.author"]).toBe("adam");
      expect(result["test"]).toBe("passed");
      expect(result["passed"]).toBe("event_payload");

      // from basic calls like session start which have nothing to pass in and aren't using
      result = sdk.retrievePersonalizationProperties({}, {});
      expect(result["user.testkey"]).toBe("testvalue");
      expect(result["user.author"]).toBe("adam");
      expect(result["test"]).toBe("passed");
      expect(result["passed"]).toBeUndefined();

      done();
    }, 500);
  });
});
