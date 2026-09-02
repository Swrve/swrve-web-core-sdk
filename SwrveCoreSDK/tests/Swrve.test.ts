import PAL from "../src/utils/PAL";
import { Swrve } from "../src/Swrve";
import { SwrveCoreSDK } from "../src/SwrveCoreSDK";
import { MockSwrveRestClient } from "./mocks/MockSwrveRestClient";
import {
  ISwrveCampaignResourceResponse,
  ISwrveEmbeddedMessage,
} from "../src/interfaces/ISwrveCampaign";
import { CAMPAIGN_MATCH } from "../src/utils/SwrveConstants";
import { parseUuid } from "../src/utils/uuid";
import { IQueryParams } from "../src/interfaces/IQueryParams";
import IResourceDiff from "../src/interfaces/IResourceDiff";
import {
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

import _inAppMessageMC = require("./resources/json/SwrveSDKTests-messageCenter.json");
const inAppMessageMC: ISwrveCampaignResourceResponse = _inAppMessageMC as any;
inAppMessageMC.campaigns.campaigns[0].start_date = Date.now() - twoDays;
inAppMessageMC.campaigns.campaigns[0].end_date = Date.now() + twoDays;

import _personalizedIAMMC = require("./resources/json/CampaignManagerTests-messageCenterPersonalized.json");
const personalizedIAMMC: ISwrveCampaignResourceResponse = _personalizedIAMMC as any;
personalizedIAMMC.campaigns.campaigns[0].start_date = Date.now() - twoDays;
personalizedIAMMC.campaigns.campaigns[0].end_date = Date.now() + twoDays;
personalizedIAMMC.campaigns.campaigns[1].start_date = Date.now() - twoDays;
personalizedIAMMC.campaigns.campaigns[1].end_date = Date.now() + twoDays;
personalizedIAMMC.campaigns.campaigns[2].start_date = Date.now() - twoDays;
personalizedIAMMC.campaigns.campaigns[2].end_date = Date.now() + twoDays;

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
import HTMLSwrveInAppElement from "../src/Campaigns/Messages/HTMLSwrveInAppElement";
import {
  ISwrveMessageButtonDetails,
  ISwrveMessageDetails,
  SwrveMessageAction,
} from "../src/interfaces/ISwrveMessageListener";

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
    const date = new Date("2019-04-07T10:20:30Z");
    /* Pin the clock with a spy rather than assigning over DateHelper.nowInUtcTime:
       a direct assignment cannot be restored, so it leaked into every later test
       in this file and silently broke anything that depends on the current time
       (e.g. campaign active-window checks). */
    const nowSpy = jest
      .spyOn(DateHelper, "nowInUtcTime")
      .mockReturnValue(date.getTime());

    try {
      restClient.changeResponse({ json: () => passes });
      pal.synchronousStorage!.clear();

      const sdk = new Swrve(
        { appId: 30512, apiKey: "1234" },
        { restClient, platform: pal }
      );
      sdk.init();

      const profileManager = sdk["profileManager"];
      expect(profileManager.currentUser.firstUse).not.toBe(0);
      expect(profileManager.currentUser.firstUse).toBe(date.getTime());
    } finally {
      nowSpy.mockRestore();
    }
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

  it("Test event with only valid names being queued", (done) => {
    const restClient = new MockSwrveRestClient();
  
    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();
  
    const eventNames = [
      "test",
      "Swrve.test",
      "swrve.test",
      "test ",
      "test a b",
      "",
      " "
    ];
  
    eventNames.forEach(eventName => {
      try {
        sdk.event(eventName, { type: "test", amount: 4 });
      } catch (error) {
      }
    });
  
    const eventManager = sdk["evtManager"];
    const queue = eventManager.getQueue();
    expect(queue.length).toEqual(3);
    sdk.shutdown();
    done();
    
    restClient.changeResponse({ status: 200 });
  });

  it("queues generic campaign events", () => {
    const restClient = new MockSwrveRestClient();
    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );

    sdk["handleGenericCampaignEvent"]({
      campaignType: "iam",
      actionType: "navigation",
      id: 740417,
      contextId: 1,
      payload: {
        pageName: "first",
        to: 2,
        buttonId: 1,
        buttonName: "Next",
      },
    });

    const eventQueue = sdk.getQueuedEvents();
    const genericCampaignEvents = eventQueue.filter(
      (evt: any) => evt.type === "generic_campaign_event"
    );
    expect(genericCampaignEvents.length).toBe(1);
    expect((genericCampaignEvents[0] as any).campaignType).toBe("iam");
    expect((genericCampaignEvents[0] as any).actionType).toBe("navigation");
    expect((genericCampaignEvents[0] as any).id).toBe(740417);
    expect((genericCampaignEvents[0] as any).contextId).toBe(1);
    expect((genericCampaignEvents[0] as any).payload.pageName).toBe("first");
    expect((genericCampaignEvents[0] as any).payload.to).toBe(2);

    sdk.shutdown();
  });

  it("queues button data capture events and user updates", () => {
    const restClient = new MockSwrveRestClient();
    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );

    sdk["handleDataCaptureEvent"]({
      events: [
        {
          name: "bw.test",
          payload: [
            { key: "prop 1", value: "value is ${user.name}" },
          ],
        },
      ],
      user_updates: [
        { key: "user.update", value: "update is ${user.name}" },
      ],
      personalizationProperties: {
        "user.name": "Kevin",
      },
    });

    const eventQueue = sdk.getQueuedEvents();
    const namedEvents = eventQueue.filter(
      (evt: any) => evt.type === "event" && evt.name === "bw.test"
    );
    expect(namedEvents.length).toBe(1);
    expect((namedEvents[0] as any).payload["prop 1"]).toBe("value is Kevin");

    const userUpdates = eventQueue.filter((evt: any) => evt.type === "user");
    expect(userUpdates.length).toBe(1);
    expect((userUpdates[0] as any).attributes["user.update"]).toBe("update is Kevin");

    sdk.shutdown();
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
      expect(contentParams.orientation).toBe("both");

      // version numbers for Swrve backend items
      expect(contentParams.version).toBe("10");
      expect(contentParams.embedded_campaign_version).toBe("3");

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
      sdk.deviceUpdate({ web_push_token: "test" });
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

      sdk.identify(
        "",
        () => {},
        () => {}
      );
      sdk.event("test", {});
      sdk.deviceUpdate({ web_push_token: "test" });
      sdk.iap(1, "sword", 5, "gold");
      sdk.userUpdate({ name: "test" });
      sdk.userUpdateWithDate("test", new Date());
      sdk.currencyGiven("gold", 10);
      sdk.purchase("sword", "gold", 10, 10);

      expect(sdk["pauseSDK"]).toBeFalsy;
      expect(queueEvent.mock.calls.length).toBeGreaterThan(7);
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
      sdk.deviceUpdate({ web_push_token: "test" });
      sdk.iap(1, "sword", 5, "gold");
      sdk.userUpdate({ name: "test" });
      sdk.userUpdateWithDate("test", new Date());
      sdk.currencyGiven("gold", 10);
      sdk.purchase("sword", "gold", 10, 10);

      const qaQueue = sdk.getQALogging().getQueue();
      expect(queueEvent.mock.calls.length).toBe(7);
      // there will be more than 6 due to specific QA events.
      expect(qaQueue.length).toBeGreaterThan(7);

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

  it("Notification Delivery and Engagement Batch Events queue correctly", (done) => {
    restClient.changeResponse({ json: () => qaUser });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );
    sdk.init();
    setTimeout(() => {
      const pushEvents = [
        {
          id: 1,
          event_type: "swrve.push_received",
          event: "Swrve.Messages.Push-1.delivered",
          payload: {},
          user_id: "4e56eddb-2930-4119-8f93-75304588a5ec",
          timestamp: 1701873418769,
        },
        {
          id: 2,
          event_type: "swrve.push_clicked",
          event: "Swrve.Messages.Push-1.engaged",
          payload: {},
          user_id: "4e56eddb-2930-4119-8f93-75304588a5ec",
          timestamp: 1701873421827,
        },
      ];

      sdk.enqueuePushEvents(pushEvents);

      const eventQueue = sdk.getQueuedEvents();
      const qaQueue = sdk.getQALogging().getQueue();

      // Delivered is sent as a generic_campaign_event (parity with iOS/Android),
      // not a named event.
      const deliveredEvents = eventQueue.filter(
        (evt: any) =>
          evt.type === "generic_campaign_event" &&
          evt.campaignType === "push" &&
          evt.actionType === "delivered" &&
          String(evt.id) === "1"
      );
      expect(deliveredEvents.length).toBe(1);
      // The receipt timestamp is preserved on the delivered event.
      expect((deliveredEvents[0] as any).time).toBe(1701873418769);

      const deliveredQAEvents = qaQueue.filter(
        (evt: any) =>
          evt.type === "qa_log_event" &&
          evt.log_details &&
          evt.log_details.type === "generic_campaign_event" &&
          evt.log_details.parameters &&
          evt.log_details.parameters.actionType === "delivered"
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

  it("IAM will fire when called from the on messageCenter", (done) => {
    restClient.changeResponse({ json: () => inAppMessageMC });

    const sdk = new Swrve(
      {
        appId: 30512,
        apiKey: "1234",
      },
      { restClient, platform: pal }
    );

    sdk.init();

    setTimeout(() => {

      const localProperties = {
        "user.author": "thomas",
      } as IDictionary<string>;
      const mc = sdk.getMessageCenterCampaigns(localProperties);
      expect(mc.length).toBe(1);

      sdk.showMessageCenterCampaign(mc[0], localProperties);

      const iamItem = document.getElementsByTagName("swrve-in-app-message")[0] as HTMLSwrveInAppElement;
      expect(iamItem.shadowRoot?.getElementById("swrveIAM__button-0")).not.toBeNull();

      const eventQueue = sdk.getQueuedEvents();
      const qaQueue = sdk.getQALogging().getQueue();

      expect(eventQueue.length).toBe(3);
      expect(qaQueue.length).toBe(5);

      const deliveredEvents = eventQueue.filter(
        (evt) =>
          evt.type === "event" && evt.name === "Swrve.Messages.Message-317655.impression"
      );
      expect(deliveredEvents.length).toBe(1);

      const pageViewEvents = eventQueue.filter(
        (evt: any) =>
          evt.type === "generic_campaign_event" &&
          evt.campaignType === "iam" &&
          evt.actionType === "page_view" &&
          evt.id === 317655 &&
          evt.contextId === 0
      );
      expect(pageViewEvents.length).toBe(1);

      const deliveredQAEvents = qaQueue.filter(
        (evt) =>
          evt.type === "qa_log_event" &&
          JSON.stringify(evt.log_details).indexOf(
            "Swrve.Messages.Message-317655.impression"
          ) !== -1
      );

      expect(deliveredQAEvents.length).toBe(1);

      done();
    }, 1000);
  });

  it("Queues a QA log when a message center campaign by id is not returned", (done) => {
    const response = JSON.parse(JSON.stringify(personalizedIAMMC));
    response.campaigns.campaigns.forEach((campaign: any) => {
      campaign.start_date = DateHelper.nowInUtcTime() - twoDays;
      campaign.end_date = DateHelper.nowInUtcTime() + twoDays;
    });
    restClient.changeResponse({ json: () => response });

    const sdk = new Swrve(
      {
        appId: 30512,
        apiKey: "1234",
      },
      { restClient, platform: pal }
    );

    sdk.init();

    setTimeout(() => {
      try {
        const campaign = sdk.getMessageCenterCampaign(315425, {});
        expect(campaign).toBeNull();

        const qaQueue = sdk.getQALogging().getQueue();
        const messageCenterQAEvents = qaQueue.filter(
          (evt: any) =>
            evt.log_type === "campaign-triggered" &&
            evt.log_details.event_name === "Swrve.Messages.MessageCenterCampaign"
        );

        expect(messageCenterQAEvents).toHaveLength(1);
        const qaEvent = messageCenterQAEvents[0] as any;
        expect(qaEvent.log_details.displayed).toBe("false");
        expect(qaEvent.log_details.reason).toBe(
          "Campaign 315425 has unresolved personalization properties."
        );
        expect(qaEvent.log_details.campaigns[0].id).toBe(315425);

        done();
      } catch (error) {
        done(error);
      }
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

      sdk.showMessageCenterCampaign(mc[0], localProperties);

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
        personalizationProvider,
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

      sdk.event("embedded.trigger", { payload_key: "payload_value" });

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

  it("IAM impression event includes platform and deviceType (iOS/Android parity)", () => {
    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform: pal }
    );

    sdk.queueMessageImpressionEvent({ id: 987654 } as any);

    const impression = sdk
      .getQueuedEvents()
      .find(
        (evt: any) =>
          evt.type === "event" &&
          evt.name === "Swrve.Messages.Message-987654.impression"
      ) as any;

    expect(impression).toBeDefined();
    expect(impression.payload.embedded).toBe("false");
    expect(impression.payload.platform).toBe("Base");
    expect(impression.payload.deviceType).toBe("TEST-DEVICE-TYPE");
  });

  it("messageListener receives Impression with no selected button on trigger", (done) => {
    restClient.changeResponse({ json: () => passes });

    const messageListener = jest.fn();
    const sdk = new Swrve(
      {
        appId: 30512,
        apiKey: "1234",
        inAppMessageConfig: {
          autoShowMessagesMaxDelay: 5000,
          messageListener,
        },
      },
      { restClient, platform: pal }
    );

    const cm = sdk["campaignManager"];
    jest.spyOn(cm as any, "applyGlobalRules").mockImplementation(() => ({
      status: CAMPAIGN_MATCH,
      message: "Campaign 315415 passes display rules",
    }));
    jest.spyOn(cm as any, "applyCampaignRules").mockImplementation(() => ({
      status: CAMPAIGN_MATCH,
      message: "Campaign 315415 passes display rules",
    }));

    sdk.init();

    setTimeout(() => {
      sdk.event("tv.event_simple", {});

      const impressions = messageListener.mock.calls.filter(
        (call) => call[0] === SwrveMessageAction.Impression
      );
      expect(impressions.length).toBe(1);

      const details = impressions[0][1] as ISwrveMessageDetails;
      expect(details.variantId).toBe(317653);
      expect(details.messageName).toBe("Rachel Trigger Test");
      expect(details.campaignId).toBe(315415);
      expect(impressions[0][2]).toBeUndefined();

      done();
    }, 1000);
  });

  it("messageListener receives Impression from showMessageCenterCampaign", (done) => {
    restClient.changeResponse({ json: () => inAppMessageMC });

    const messageListener = jest.fn();
    const sdk = new Swrve(
      {
        appId: 30512,
        apiKey: "1234",
        inAppMessageConfig: {
          autoShowMessagesMaxDelay: 5000,
          messageListener,
        },
      },
      { restClient, platform: pal }
    );

    sdk.init();

    setTimeout(() => {
      const mc = sdk.getMessageCenterCampaigns();
      expect(mc.length).toBe(1);

      sdk.showMessageCenterCampaign(mc[0]);

      const impressions = messageListener.mock.calls.filter(
        (call) => call[0] === SwrveMessageAction.Impression
      );
      expect(impressions.length).toBe(1);

      const details = impressions[0][1] as ISwrveMessageDetails;
      expect(details.variantId).toBe(317655);
      expect(details.messageName).toBe("Message Center Test");
      expect(details.campaignId).toBe(315425);
      expect(impressions[0][2]).toBeUndefined();

      done();
    }, 1000);
  });

  it("messageListener is not invoked for embedded campaign impressions", (done) => {
    restClient.changeResponse({ json: () => embeddedMessageTriggered });

    const embeddedCallback = jest.fn();
    const messageListener = jest.fn();
    const sdk = new Swrve(
      {
        appId: 30512,
        apiKey: "1234",
        embeddedMessageConfig: { embeddedCallback } as ISwrveEmbeddedMessageConfig,
        inAppMessageConfig: {
          autoShowMessagesMaxDelay: 5000,
          messageListener,
        },
      },
      { restClient, platform: pal }
    );

    const cm = sdk["campaignManager"];
    jest.spyOn(cm as any, "applyGlobalRules").mockImplementation(() => ({
      status: CAMPAIGN_MATCH,
      message: "Campaign 315415 passes display rules",
    }));
    jest.spyOn(cm as any, "applyCampaignRules").mockImplementation(() => ({
      status: CAMPAIGN_MATCH,
      message: "Campaign 315415 passes display rules",
    }));

    sdk.init();

    setTimeout(() => {
      sdk.event("embedded.trigger", {});
      expect(embeddedCallback.mock.calls.length).toBe(1);

      const embeddedMessage = embeddedCallback.mock
        .calls[0][0] as ISwrveEmbeddedMessage;
      sdk.embeddedMessageWasShownToUser(embeddedMessage);
      sdk.embeddedControlMessageImpressionEvent(embeddedMessage);

      const impression = sdk
        .getQueuedEvents()
        .find(
          (evt: any) =>
            evt.type === "event" &&
            evt.name === "Swrve.Messages.Message-527804.impression"
        ) as any;
      expect(impression).toBeDefined();
      expect(impression.payload.embedded).toBe("true");

      expect(messageListener).not.toHaveBeenCalled();

      done();
    }, 1000);
  });

  it("a throwing messageListener does not break impression event queueing", (done) => {
    restClient.changeResponse({ json: () => inAppMessageMC });

    const messageListener = jest.fn(() => {
      throw new Error("integrator callback blew up");
    });
    const sdk = new Swrve(
      {
        appId: 30512,
        apiKey: "1234",
        inAppMessageConfig: {
          autoShowMessagesMaxDelay: 5000,
          messageListener,
        },
      },
      { restClient, platform: pal }
    );

    sdk.init();

    setTimeout(() => {
      const mc = sdk.getMessageCenterCampaigns();

      expect(() => sdk.showMessageCenterCampaign(mc[0])).not.toThrow();
      expect(messageListener).toHaveBeenCalled();

      const impression = sdk
        .getQueuedEvents()
        .find(
          (evt: any) =>
            evt.type === "event" &&
            evt.name === "Swrve.Messages.Message-317655.impression"
        ) as any;
      expect(impression).toBeDefined();

      done();
    }, 1000);
  });

  it("messageListener receives Custom with the selected button on custom button click", (done) => {
    restClient.changeResponse({ json: () => noQAUser });

    const messageListener = jest.fn();
    const sdk = new Swrve(
      {
        appId: 30512,
        apiKey: "1234",
        inAppMessageConfig: {
          autoShowMessagesMaxDelay: 5000,
          messageListener,
        },
      },
      { restClient, platform: pal }
    );

    sdk.init();

    setTimeout(() => {
      const campaign = sdk
        .getMessageCenterCampaigns()
        .find((c) => c.id === 298948)!;
      expect(campaign).toBeDefined();

      sdk.showMessageCenterCampaign(campaign);

      const iamItems = document.getElementsByTagName("swrve-in-app-message");
      const iamItem = iamItems[iamItems.length - 1] as HTMLSwrveInAppElement;
      /* The shadow root is attached in "closed" mode, so element.shadowRoot is
       * always null — reach the rendered buttons via the internal canvas. */
      const customButton = (iamItem as any)._canvasElement.querySelector(
        "#swrveIAM__button-1"
      ) as HTMLElement;
      customButton.click();

      const customCalls = messageListener.mock.calls.filter(
        (call) => call[0] === SwrveMessageAction.Custom
      );
      expect(customCalls.length).toBe(1);

      const details = customCalls[0][1] as ISwrveMessageDetails;
      expect(details.variantId).toBe(301432);
      expect(details.messageName).toBe("OTT_DEMO");
      expect(details.campaignId).toBe(298948);

      const selectedButton = customCalls[0][2] as ISwrveMessageButtonDetails;
      expect(selectedButton.buttonName).toBe("Button One");
      expect(selectedButton.actionType).toBe("CUSTOM");
      expect(selectedButton.actionString).toBe("https://www.google.com");

      done();
    }, 1000);
  });

  it("resolves personalization in a custom action before opening it", (done) => {
    /* Button One's action carries personalization; the campaign is only
       served because "user.id" resolves. */
    const personalizedActions = JSON.parse(JSON.stringify(noQAUser));
    const campaignJson = personalizedActions.campaigns.campaigns.find(
      (c: any) => c.id === 298948
    );
    const buttons = campaignJson.message.template.formats[0].buttons;
    buttons[1].action.value = "https://shop.example.com/user/${user.id}/cart";

    restClient.changeResponse({ json: () => personalizedActions });

    const openLink = jest.spyOn(pal, "openLink");
    const messageListener = jest.fn();
    const sdk = new Swrve(
      {
        appId: 30512,
        apiKey: "1234",
        personalizationProvider: () => ({ "user.id": "12345" }),
        inAppMessageConfig: {
          autoShowMessagesMaxDelay: 5000,
          messageListener,
        },
      },
      { restClient, platform: pal }
    );

    sdk.init();

    setTimeout(() => {
      const campaign = sdk
        .getMessageCenterCampaigns()
        .find((c) => c.id === 298948)!;
      expect(campaign).toBeDefined();

      const qaSpy = jest.spyOn(sdk.getQALogging(), "buttonClickEvent");

      sdk.showMessageCenterCampaign(campaign);

      const iamItems = document.getElementsByTagName("swrve-in-app-message");
      const iamItem = iamItems[iamItems.length - 1] as HTMLSwrveInAppElement;
      const customButton = (iamItem as any)._canvasElement.querySelector(
        "#swrveIAM__button-1"
      ) as HTMLElement;
      customButton.click();

      expect(openLink).toHaveBeenCalledWith(
        "https://shop.example.com/user/12345/cart"
      );

      const customCalls = messageListener.mock.calls.filter(
        (call) => call[0] === SwrveMessageAction.Custom
      );
      expect(customCalls.length).toBe(1);
      const selectedButton = customCalls[0][2] as ISwrveMessageButtonDetails;
      expect(selectedButton.actionString).toBe(
        "https://shop.example.com/user/12345/cart"
      );

      /* QA logging keeps the authored action, matching Android */
      expect(qaSpy).toHaveBeenCalledWith(
        298948,
        301432,
        "Button One",
        "CUSTOM",
        "https://shop.example.com/user/${user.id}/cart",
        expect.any(Number)
      );

      openLink.mockRestore();
      qaSpy.mockRestore();
      sdk.shutdown();
      done();
    }, 1000);
  });

  it("resolves personalization in the button text given to the listener", (done) => {
    /* iOS (SwrveMessageUIView displayString) and Android (resolvedText) both
       hand the listener the button text as it was displayed, so Web does too. */
    const personalizedText = JSON.parse(JSON.stringify(noQAUser));
    const campaignJson = personalizedText.campaigns.campaigns.find(
      (c: any) => c.id === 298948
    );
    const buttons = campaignJson.message.template.formats[0].buttons;
    buttons[1].text = { type: "text", value: "Upgrade, ${user.name}" };

    /* jsdom has no 2D canvas context and the text button path measures text to
     * fit its font size, so stub it for this render only. */
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
      font: "",
      measureText: () => ({
        width: 50,
        actualBoundingBoxAscent: 10,
        actualBoundingBoxDescent: 2,
      }),
    }) as any;

    restClient.changeResponse({ json: () => personalizedText });

    const messageListener = jest.fn();
    const sdk = new Swrve(
      {
        appId: 30512,
        apiKey: "1234",
        personalizationProvider: () => ({ "user.name": "Kevin" }),
        inAppMessageConfig: {
          autoShowMessagesMaxDelay: 5000,
          messageListener,
        },
      },
      { restClient, platform: pal }
    );

    sdk.init();

    setTimeout(() => {
      const campaign = sdk
        .getMessageCenterCampaigns()
        .find((c) => c.id === 298948)!;
      expect(campaign).toBeDefined();

      sdk.showMessageCenterCampaign(campaign);

      const iamItems = document.getElementsByTagName("swrve-in-app-message");
      const iamItem = iamItems[iamItems.length - 1] as HTMLSwrveInAppElement;
      const customButton = (iamItem as any)._canvasElement.querySelector(
        "#swrveIAM__button-1"
      ) as HTMLElement;
      customButton.click();

      HTMLCanvasElement.prototype.getContext = originalGetContext;

      const customCalls = messageListener.mock.calls.filter(
        (call) => call[0] === SwrveMessageAction.Custom
      );
      expect(customCalls.length).toBe(1);
      const selectedButton = customCalls[0][2] as ISwrveMessageButtonDetails;
      expect(selectedButton.buttonText).toBe("Upgrade, Kevin");

      sdk.shutdown();
      done();
    }, 1000);
  });

  it("resolves personalization in a custom scheme action without opening it", (done) => {
    const personalizedActions = JSON.parse(JSON.stringify(noQAUser));
    const campaignJson = personalizedActions.campaigns.campaigns.find(
      (c: any) => c.id === 298948
    );
    const buttons = campaignJson.message.template.formats[0].buttons;
    buttons[2].action.value = "SwrveDevApp://settings/${user.id}";

    restClient.changeResponse({ json: () => personalizedActions });

    const openLink = jest.spyOn(pal, "openLink");
    const messageListener = jest.fn();
    const sdk = new Swrve(
      {
        appId: 30512,
        apiKey: "1234",
        personalizationProvider: () => ({ "user.id": "12345" }),
        inAppMessageConfig: {
          autoShowMessagesMaxDelay: 5000,
          messageListener,
        },
      },
      { restClient, platform: pal }
    );

    sdk.init();

    setTimeout(() => {
      const campaign = sdk
        .getMessageCenterCampaigns()
        .find((c) => c.id === 298948)!;
      sdk.showMessageCenterCampaign(campaign);

      const iamItems = document.getElementsByTagName("swrve-in-app-message");
      const iamItem = iamItems[iamItems.length - 1] as HTMLSwrveInAppElement;
      const customButton = (iamItem as any)._canvasElement.querySelector(
        "#swrveIAM__button-2"
      ) as HTMLElement;
      customButton.click();

      expect(openLink).not.toHaveBeenCalled();

      const customCalls = messageListener.mock.calls.filter(
        (call) => call[0] === SwrveMessageAction.Custom
      );
      expect(customCalls.length).toBe(1);
      const selectedButton = customCalls[0][2] as ISwrveMessageButtonDetails;
      expect(selectedButton.actionString).toBe(
        "SwrveDevApp://settings/12345"
      );

      openLink.mockRestore();
      sdk.shutdown();
      done();
    }, 1000);
  });

  it("messageListener receives Dismiss with the selected button on dismiss button click", (done) => {
    restClient.changeResponse({ json: () => noQAUser });

    const messageListener = jest.fn();
    const sdk = new Swrve(
      {
        appId: 30512,
        apiKey: "1234",
        inAppMessageConfig: {
          autoShowMessagesMaxDelay: 5000,
          messageListener,
        },
      },
      { restClient, platform: pal }
    );

    sdk.init();

    setTimeout(() => {
      const campaign = sdk
        .getMessageCenterCampaigns()
        .find((c) => c.id === 298948)!;
      sdk.showMessageCenterCampaign(campaign);

      const iamItems = document.getElementsByTagName("swrve-in-app-message");
      const iamItem = iamItems[iamItems.length - 1] as HTMLSwrveInAppElement;
      const dismissButton = (iamItem as any)._canvasElement.querySelector(
        "#swrveIAM__button-0"
      ) as HTMLElement;
      dismissButton.click();

      const dismissCalls = messageListener.mock.calls.filter(
        (call) => call[0] === SwrveMessageAction.Dismiss
      );
      expect(dismissCalls.length).toBe(1);

      const details = dismissCalls[0][1] as ISwrveMessageDetails;
      expect(details.variantId).toBe(301432);
      expect(details.messageName).toBe("OTT_DEMO");
      expect(details.campaignId).toBe(298948);

      const selectedButton = dismissCalls[0][2] as ISwrveMessageButtonDetails;
      expect(selectedButton.buttonName).toBe("Background");
      expect(selectedButton.actionType).toBe("DISMISS");
      expect(selectedButton.actionString).toBe("");

      done();
    }, 1000);
  });
});
