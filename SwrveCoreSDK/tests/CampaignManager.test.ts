import { CampaignManager } from "../src/Campaigns/CampaignManager";
import {
  ISwrveCampaignResourceResponse,
  ISwrveCampaigns,
} from "../src/interfaces/ISwrveCampaign";
import { StorageManager } from "../src/Storage/StorageManager";
import { ProfileManager } from "../src/Profile/ProfileManager";
import { SwrveCoreSDK } from "../src/SwrveCoreSDK";
import HTMLSwrveInAppElement from "../src/Campaigns/Messages/HTMLSwrveInAppElement";
import {
  CAMPAIGN_STATE,
  CAMPAIGNS,
} from "../src/utils/SwrveConstants";
import { Swrve } from "../src/Swrve";
import { MockSwrveRestClient } from "./mocks/MockSwrveRestClient";
import PlatformMock from "./mocks/PlatformMock";
import PAL from "../src/utils/PAL";
import DateHelper from "../src/utils/DateHelper";


const twoDays = 172800000;

import _changedData = require("./resources/json/CampaignManagerTests-changedData.json");
const changedData: ISwrveCampaignResourceResponse = _changedData as any;

import _data = require("./resources/json/CampaignManagerTests-data.json");
const data: ISwrveCampaignResourceResponse = _data as any;

import _noMessageCenterCampaigns = require("./resources/json/CampaignManagerTests-noMessageCenterCampaigns.json");
const noMessageCenterCampaigns: ISwrveCampaignResourceResponse =
  _noMessageCenterCampaigns;

import _campaignsOnly = require("./resources/json/CampaignManagerTests-campaignsOnly.json");
const campaignsOnly: ISwrveCampaignResourceResponse = _campaignsOnly as any;

import _embeddedMessageCenter = require("./resources/json/CampaignManagerTests-embeddedMessageCenter.json");
const embeddedMessageCenter: ISwrveCampaignResourceResponse =
  _embeddedMessageCenter as any;

import _passes = require("./resources/json/CampaignManagerTests-passes.json");
const passes: ISwrveCampaignResourceResponse = _passes as any;
passes.campaigns.campaigns[0].start_date = Date.now() - twoDays;
passes.campaigns.campaigns[0].end_date = Date.now() + twoDays;

import _personalizedIAMMC = require ("./resources/json/CampaignManagerTests-messageCenterPersonalized.json");
const personalizedIAMMC: ISwrveCampaignResourceResponse = _personalizedIAMMC as any;

personalizedIAMMC.campaigns.campaigns[0].start_date = Date.now() - twoDays;
personalizedIAMMC.campaigns.campaigns[0].end_date = Date.now() + twoDays;
personalizedIAMMC.campaigns.campaigns[1].start_date = Date.now() - twoDays;
personalizedIAMMC.campaigns.campaigns[1].end_date = Date.now() + twoDays;
personalizedIAMMC.campaigns.campaigns[2].start_date = Date.now() - twoDays;
personalizedIAMMC.campaigns.campaigns[2].end_date = Date.now() + twoDays;

/* setup global variables */
let platform = new PlatformMock();
let user = {
  userId: "SwrveUser",
  sessionToken: "abc",
  nextSeqNum: 1,
  sessionStart: Date.now(),
  isQAUser: false,
  qaUserNextSeqNum: 0,
};
const storageManager = new StorageManager(platform);
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

// AssetManager resolves the platform via PAL -> SwrveCoreSDK.getPlatform().
// Point it at the mock so asset-cache checks (checkStorageForAsset) resolve;
// it returns true by default, so campaigns render unless a test overrides it.
jest.spyOn(SwrveCoreSDK, "getPlatform").mockReturnValue(platform);

const setUpCampaignManagerWithData = (initialData: any) => {
  const campaignManager = new CampaignManager(
    profileManager,
    platform,
    storageManager
  );

  if (initialData) {
    campaignManager.storeCampaigns(initialData, {}, () => {});
  }

  return campaignManager;
};

/* Runs fn with the SDK's notion of "now" pinned, so campaign active-window rules
   (start/end dates, blackout dates, interval times) are deterministic. */
const withMockedNow = <T>(iso: string, fn: () => T): T => {
  const nowSpy = jest
    .spyOn(DateHelper, "nowInUtcTime")
    .mockReturnValue(new Date(iso).getTime());

  try {
    return fn();
  } finally {
    nowSpy.mockRestore();
  }
};

/* Both campaigns in `data` are message center campaigns and active by default.
   This applies an active-window override to the first (298948) only, leaving the
   second (307239) as an always-active control. */
const messageCenterCampaignsWithWindow = (
  overrides: object
): ISwrveCampaignResourceResponse => {
  const response = JSON.parse(JSON.stringify(data));

  Object.assign(response.campaigns.campaigns[0], {
    timezone_type: "global",
    start_date_iso: "2030-05-26T00:00:00Z",
    end_date_iso: "2030-05-28T00:00:00Z",
    ...overrides,
  });

  return response;
};

const videoMessageCenterCampaigns = (): ISwrveCampaignResourceResponse => ({
  campaigns: {
    game_data: {},
    cdn_root: "https://test.cdn/",
    version: 1,
    rules: {
      max_messages_per_session: 99999,
      delay_first_message: 0,
      min_delay_between_messages: 0,
    },
    campaigns: [
      {
        id: 706789,
        start_date: Date.now() - twoDays,
        end_date: Date.now() + twoDays,
        message_center: true,
        subject: "Video campaign",
        triggers: [{ event_name: "trigger_video_iam", conditions: {} }],
        rules: {
          display_order: "random",
          dismiss_after_views: 5,
          delay_first_message: 0,
          min_delay_between_messages: 0,
        },
        message: {
          id: 800,
          name: "Video IAM",
          priority: 1,
          rules: { orientations: "landscape" },
          template: {
            formats: [
              {
                name: "landscape",
                orientation: "landscape",
                language: "*",
                size: {
                  w: { type: "number", value: 320 },
                  h: { type: "number", value: 240 },
                },
                images: [
                  {
                    x: { type: "number", value: 0 },
                    y: { type: "number", value: 0 },
                    w: { type: "number", value: 320 },
                    h: { type: "number", value: 240 },
                    image: { type: "asset", value: "video-asset-sha" },
                    media_format: "mp4",
                    video_settings: {
                      auto_play: true,
                      loop: false,
                      fill_screen: false,
                      show_controls: true,
                    },
                  },
                ],
                buttons: [],
                scaled_by: 1,
                scaled_from: "landscape",
                scale: 1,
              },
            ],
          },
        },
      },
    ],
  },
  flush_frequency: 60,
  flush_refresh_delay: 60,
} as any);

const buttonActionPersonalizedCampaigns =
  (): ISwrveCampaignResourceResponse =>
    ({
      campaigns: {
        game_data: {},
        cdn_root: "https://test.cdn/",
        version: 1,
        rules: {
          max_messages_per_session: 99999,
          delay_first_message: 0,
          min_delay_between_messages: 0,
        },
        campaigns: [
          {
            id: 706790,
            start_date: Date.now() - twoDays,
            end_date: Date.now() + twoDays,
            message_center: true,
            subject: "Personalized action campaign",
            triggers: [{ event_name: "trigger_action_iam", conditions: {} }],
            rules: {
              display_order: "random",
              dismiss_after_views: 5,
              delay_first_message: 0,
              min_delay_between_messages: 0,
            },
            message: {
              id: 801,
              name: "Personalized Action IAM",
              priority: 1,
              rules: { orientations: "landscape" },
              template: {
                formats: [
                  {
                    name: "landscape",
                    orientation: "landscape",
                    language: "*",
                    size: {
                      w: { type: "number", value: 320 },
                      h: { type: "number", value: 240 },
                    },
                    images: [],
                    buttons: [
                      {
                        name: "Shop",
                        x: { type: "number", value: 0 },
                        y: { type: "number", value: 0 },
                        w: { type: "number", value: 320 },
                        h: { type: "number", value: 240 },
                        image_width: 320,
                        image_height: 240,
                        image_filename: "button.png",
                        type: { type: "text", value: "CUSTOM" },
                        action: {
                          type: "text",
                          value:
                            "https://shop.example.com/user/${user.id}/cart",
                        },
                        game_id: { type: "number", value: "" },
                        image_up: { type: "asset", value: "button-asset-sha" },
                      },
                    ],
                    scaled_by: 1,
                    scaled_from: "landscape",
                    scale: 1,
                  },
                ],
              },
            },
          },
        ],
      },
      flush_frequency: 60,
      flush_refresh_delay: 60,
    } as any);

const holdoutCampaigns = (): ISwrveCampaignResourceResponse => ({
  campaigns: {
    game_data: {},
    cdn_root: "https://test.cdn/",
    version: 1,
    rules: {
      max_messages_per_session: 99999,
      delay_first_message: 0,
      min_delay_between_messages: 0,
    },
    campaigns: [
      {
        id: 100,
        start_date: Date.now() - twoDays,
        end_date: Date.now() + twoDays,
        message_center: false,
        subject: null,
        triggers: [{ event_name: "trigger_iam", conditions: {} }],
        rules: {
          display_order: "random",
          dismiss_after_views: 5,
          delay_first_message: 0,
          min_delay_between_messages: 0,
        },
        message: {
          id: 165,
          name: "IAM Holdout",
          priority: 1,
          control: true,
          rules: { orientations: "landscape" },
          template: {
            formats: [
              {
                name: "landscape",
                orientation: "landscape",
                language: "*",
                size: {
                  w: { type: "number", value: 320 },
                  h: { type: "number", value: 240 },
                },
                images: [],
                buttons: [],
                scaled_by: 1,
                scaled_from: "landscape",
                scale: 1,
              },
            ],
          },
        },
      },
      {
        id: 101,
        start_date: Date.now() - twoDays,
        end_date: Date.now() + twoDays,
        message_center: false,
        subject: null,
        triggers: [{ event_name: "trigger_embedded", conditions: {} }],
        rules: {
          display_order: "random",
          dismiss_after_views: 5,
          delay_first_message: 0,
          min_delay_between_messages: 0,
        },
        embedded_message: {
          id: 21,
          name: "Embedded Holdout",
          priority: 1,
          rules: { orientations: "landscape" },
          control: true,
          data: "test string",
          dataRaw: "test string",
          type: "other",
          buttons: [],
        },
      },
    ],
  },
  flush_frequency: 60,
  flush_refresh_delay: 60,
});

jest.spyOn(SwrveCoreSDK, "getPlatform").mockReturnValue(new PlatformMock());

describe("CAMPAIGN MANAGER TESTS", () => {
  beforeEach(() => {
    platform.synchronousStorage.clear();
  });

  it("Stores campaigns to local storage", () => {
    setUpCampaignManagerWithData(data);

    const storedCampaigns = storageManager.getData(`campaigns${user.userId}`);
    if (storedCampaigns) {
      const json = JSON.parse(storedCampaigns);
      expect(json.length).toEqual(2);
      expect(json[0].id).toEqual(298948);
    }

    const storedState = storageManager.getData(`campaignState${user.userId}`);
    if (storedState) {
      const json = JSON.parse(storedState);
      expect(json["298948"].impressions).toEqual(0);
    }
  });

  it("Removes campaign state when campaign is no longer sent down", () => {
    const subject = setUpCampaignManagerWithData(data);

    let storedState = storageManager.getData(`campaignState${user.userId}`);

    if (storedState) {
      const json = JSON.parse(storedState);
      expect(json["298948"]).not.toBeUndefined();
    }

    subject.storeCampaigns(changedData, {}, () => {});
    storedState = storageManager.getData(`campaignState${user.userId}`);

    if (storedState) {
      const json = JSON.parse(storedState);
      expect(json["298948"]).not.toBeUndefined();
    }
  });

  it("stores state between sessions", (done) => {
    storageManager.saveData("user_id", "SwrveDevice");
    const restClient = new MockSwrveRestClient();
    restClient.changeResponse({ json: () => passes });

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform }
    );
    sdk.init();

    setTimeout(() => {
      //trigger the event to add an impression count to state object
      sdk.event("tv.event_simple", { a: 1 });

      setTimeout(() => {
        const storedData = storageManager.getData(
          CAMPAIGN_STATE + "SwrveDevice"
        );
        const state = JSON.parse(storedData!);
        expect(state).not.toBeNull;

        expect(state![315415]["impressions"]).toBe(1);
        sdk.shutdown();

        sdk.init();

        setTimeout(() => {
          const storedData = storageManager.getData(
            CAMPAIGN_STATE + "SwrveDevice"
          );
          const state = JSON.parse(storedData!);
          expect(state![315415]["impressions"]).toBe(1);
          done();
        }, 200);
      }, 400);
    }, 500);
  });

  it("Retrieves campaign state by id", () => {
    const subject = setUpCampaignManagerWithData(data);

    expect(subject.getCampaignState("298948")).not.toBeNull();
  });

  it("Queues an impression and saves state for IAM control campaigns without displaying", () => {
    document
      .querySelectorAll("swrve-in-app-message")
      .forEach((element) => element.remove());
    const subject = setUpCampaignManagerWithData(holdoutCampaigns());
    const impressionCallback = jest.fn();

    subject.checkTriggers("trigger_iam", {}, impressionCallback);

    expect(impressionCallback).toHaveBeenCalledTimes(1);
    expect(impressionCallback.mock.calls[0][0].control).toBe(true);
    expect(subject.getCampaignState("100").impressions).toBe(1);
  });

  it("Calls embedded callback with control flag for embedded control campaigns", () => {
    const subject = setUpCampaignManagerWithData(holdoutCampaigns());
    const embeddedCallback = jest.fn();

    subject.onEmbeddedMessage(embeddedCallback);
    subject.checkTriggers("trigger_embedded", {}, jest.fn());

    expect(embeddedCallback).toHaveBeenCalledTimes(1);
    expect(embeddedCallback.mock.calls[0][0].control).toBe(true);
    expect(embeddedCallback.mock.calls[0][2]).toBe(true);
    expect(subject.getCampaignState("101").impressions).toBe(0);
  });

  it("Gets message center campaigns", () => {
    const subject = setUpCampaignManagerWithData(data);

    expect(subject.getMessageCenterCampaigns()).toHaveLength(2);
  });

  it("Gets only in-app message center campaigns", () => {
    const subject = setUpCampaignManagerWithData(data);

    expect(subject.getInAppMessageCenterCampaigns()).toHaveLength(2);
  });

  it("Gets empty message center campaigns", () => {
    const subject = setUpCampaignManagerWithData(noMessageCenterCampaigns);

    expect(subject.getMessageCenterCampaigns()).toHaveLength(0);
  });

  it("Gets only message center campaigns which can render", () => {
    const subject = setUpCampaignManagerWithData(personalizedIAMMC);
    expect(subject.getMessageCenterCampaigns()).toHaveLength(1);

    // pass in the the value needed to personalize
    expect(subject.getMessageCenterCampaigns({"successfullypersonalized" : "passing"})).toHaveLength(3);
  });

  /* MG-26273: the message center list must apply the same active-window rules as
     get-by-id, and as the iOS/Android message center list APIs. */
  it("Returns a message center campaign inside its interval time", () => {
    const response = messageCenterCampaignsWithWindow({
      interval_times: [{ from: "10:00:00", to: "11:00:00" }],
    });

    const campaigns = withMockedNow("2030-05-27T10:30:00Z", () =>
      setUpCampaignManagerWithData(response).getMessageCenterCampaigns()
    );

    expect(campaigns.map((campaign) => campaign.id)).toEqual([298948, 307239]);
  });

  it("Excludes a message center campaign outside its interval time", () => {
    const response = messageCenterCampaignsWithWindow({
      interval_times: [{ from: "10:00:00", to: "11:00:00" }],
    });

    const campaigns = withMockedNow("2030-05-27T09:59:59Z", () =>
      setUpCampaignManagerWithData(response).getMessageCenterCampaigns()
    );

    expect(campaigns.map((campaign) => campaign.id)).toEqual([307239]);
  });

  it("Excludes a message center campaign inside a blackout period", () => {
    const response = messageCenterCampaignsWithWindow({
      blackout_dates: [
        { from: "2030-05-27T10:00:00Z", to: "2030-05-27T11:00:00Z" },
      ],
    });

    const campaigns = withMockedNow("2030-05-27T10:30:00Z", () =>
      setUpCampaignManagerWithData(response).getMessageCenterCampaigns()
    );

    expect(campaigns.map((campaign) => campaign.id)).toEqual([307239]);
  });

  it("Excludes a message center campaign that has not started yet", () => {
    const response = messageCenterCampaignsWithWindow({
      start_date_iso: "2030-05-28T00:00:00Z",
      end_date_iso: "2030-05-29T00:00:00Z",
    });

    const campaigns = withMockedNow("2030-05-27T10:30:00Z", () =>
      setUpCampaignManagerWithData(response).getMessageCenterCampaigns()
    );

    expect(campaigns.map((campaign) => campaign.id)).toEqual([307239]);
  });

  it("Excludes a message center campaign that has ended", () => {
    const response = messageCenterCampaignsWithWindow({
      start_date_iso: "2030-05-25T00:00:00Z",
      end_date_iso: "2030-05-26T00:00:00Z",
    });

    const campaigns = withMockedNow("2030-05-27T10:30:00Z", () =>
      setUpCampaignManagerWithData(response).getMessageCenterCampaigns()
    );

    expect(campaigns.map((campaign) => campaign.id)).toEqual([307239]);
  });

  it("Excludes an inactive campaign from the in-app message center list", () => {
    const response = messageCenterCampaignsWithWindow({
      interval_times: [{ from: "10:00:00", to: "11:00:00" }],
    });

    const campaigns = withMockedNow("2030-05-27T09:59:59Z", () =>
      setUpCampaignManagerWithData(response).getInAppMessageCenterCampaigns()
    );

    expect(campaigns.map((campaign) => campaign.id)).toEqual([307239]);
  });

  it("Agrees with get-by-id when a campaign is outside its interval time", () => {
    const response = messageCenterCampaignsWithWindow({
      interval_times: [{ from: "10:00:00", to: "11:00:00" }],
    });

    withMockedNow("2030-05-27T09:59:59Z", () => {
      const subject = setUpCampaignManagerWithData(response);

      const listed = subject
        .getMessageCenterCampaigns()
        .map((campaign) => campaign.id);
      const byId = subject.getMessageCenterCampaign(298948);
      const result = subject.getMessageCenterCampaignResult(298948);

      expect(listed).not.toContain(298948);
      expect(byId).toBeNull();
      expect(result.reason).toContain("is not active");
    });
  });

  /* Campaigns and their state are persisted under two separate storage keys and
     written by two separate saveData calls. loadStoredCampaigns() reads both but,
     unlike storeCampaigns(), never calls synchronizeCampaignState() to backfill a
     default state, so a campaign can be loaded with no state entry at all. */
  it("Returns message center campaigns when stored campaign state is missing", () => {
    const userId = profileManager.currentUser.userId;
    storageManager.saveData(
      CAMPAIGNS + userId,
      JSON.stringify(data.campaigns.campaigns)
    );
    storageManager.saveData(CAMPAIGN_STATE + userId, JSON.stringify({}));

    const subject = new CampaignManager(
      profileManager,
      platform,
      storageManager
    );

    expect(() => subject.getMessageCenterCampaigns()).not.toThrow();
    expect(
      subject.getMessageCenterCampaigns().map((campaign) => campaign.id)
    ).toEqual([298948, 307239]);
  });

  it("Excludes a message center campaign whose custom button action cannot be personalized", () => {
    const subject = setUpCampaignManagerWithData(
      buttonActionPersonalizedCampaigns()
    );

    expect(subject.getMessageCenterCampaigns()).toHaveLength(0);
    expect(subject.getInAppMessageCenterCampaigns()).toHaveLength(0);
    expect(subject.getMessageCenterCampaign(706790)).toBeNull();

    /* with the property available the same campaign is returned as before */
    expect(
      subject.getMessageCenterCampaigns({ "user.id": "12345" })
    ).toHaveLength(1);
    expect(
      subject.getInAppMessageCenterCampaigns({ "user.id": "12345" })
    ).toHaveLength(1);
    expect(
      subject.getMessageCenterCampaign(706790, { "user.id": "12345" })
    ).not.toBeNull();
  });

  it("Does not display a triggered campaign whose custom button action cannot be personalized", () => {
    const subject = setUpCampaignManagerWithData(
      buttonActionPersonalizedCampaigns()
    );

    const campaign = subject.getMessageCenterCampaigns({
      "user.id": "12345",
    })[0];
    expect(campaign).toBeDefined();

    expect(subject.showCampaign(campaign)).toBe(false);
    expect(subject.showCampaign(campaign, { "user.id": "12345" })).toBe(true);
  });

  it("Does not trigger a campaign whose custom button action cannot be personalized", () => {
    const subject = setUpCampaignManagerWithData(
      buttonActionPersonalizedCampaigns()
    );
    const impressionHandler = jest.fn();

    subject.checkTriggers("trigger_action_iam", {}, impressionHandler);
    expect(impressionHandler).not.toHaveBeenCalled();

    subject.checkTriggers("trigger_action_iam", {}, impressionHandler, false, {
      "user.id": "12345",
    });
    expect(impressionHandler).toHaveBeenCalled();
  });

  it("Does not return message center campaigns whose assets are not yet downloaded", () => {
    const subject = setUpCampaignManagerWithData(data);

    // sanity: with assets downloaded these campaigns are returned
    expect(subject.getMessageCenterCampaigns()).toHaveLength(2);

    // simulate the campaign's assets not yet being downloaded to cache
    const assetSpy = jest
      .spyOn(subject.getAssetManager(), "checkAssetsForCampaign")
      .mockReturnValue(false);

    expect(subject.getMessageCenterCampaigns()).toHaveLength(0);

    assetSpy.mockRestore();
    // and once downloaded they are returned again
    expect(subject.getMessageCenterCampaigns()).toHaveLength(2);
  });

  it("Gates a message center campaign until its video asset is cached", () => {
    /* The platform caches a video with a no-cors fetch and reports it stored
       once that preload resolves, so a video campaign is gated in exactly the
       same way as an image campaign - matching iOS/Android. */
    const videoPath = "https://test.cdn/video-asset-sha";
    let videoCached = false;
    const cacheSpy = jest
      .spyOn(PAL.getPlatform(), "checkStorageForAsset")
      .mockImplementation((asset) =>
        String(asset.getAssetPath()) === videoPath ? videoCached : true
      );

    const subject = setUpCampaignManagerWithData(videoMessageCenterCampaigns());

    expect(subject.getMessageCenterCampaigns().map((c) => c.id)).toEqual([]);

    videoCached = true;

    expect(subject.getMessageCenterCampaigns().map((c) => c.id)).toEqual([
      706789,
    ]);

    cacheSpy.mockRestore();
  });

  it("Gets a message center campaign by id", () => {
    const subject = setUpCampaignManagerWithData(personalizedIAMMC);
    const campaign = subject.getMessageCenterCampaign(315425, {
      "successfullypersonalized": "passing",
    });

    expect(campaign).not.toBeNull();
    expect(campaign!.id).toBe(315425);
  });

  it("Returns a failure reason when a message center campaign by id cannot render", () => {
    const subject = setUpCampaignManagerWithData(personalizedIAMMC);
    const result = subject.getMessageCenterCampaignResult(315425, {});

    expect(result.campaign).toBeNull();
    expect(result.reason).toBe(
      "Campaign 315425 has unresolved personalization properties."
    );
    expect(result.campaigns).toHaveLength(1);
    expect(result.campaigns[0].id).toBe(315425);
    expect(result.campaigns[0].displayed).toBe("false");
  });

  it("Returns a failure reason when a message center campaign by id does not exist", () => {
    const subject = setUpCampaignManagerWithData(personalizedIAMMC);
    const result = subject.getMessageCenterCampaignResult(999999, {});

    expect(result.campaign).toBeNull();
    expect(result.reason).toBe("Campaign 999999 was not found.");
    expect(result.campaigns).toHaveLength(0);
  });

  it("Personalizes message center details and filters unresolved details", () => {
    const response: ISwrveCampaignResourceResponse = JSON.parse(
      JSON.stringify(personalizedIAMMC)
    );
    const campaign = response.campaigns.campaigns[0] as any;
    campaign.message.message_center_details = {
      subject: "some subject personalized ${mc_subject}",
      description: "some description personalized ${mc_description}",
      dynamic_image_url: "https://${mc_image}.png",
      accessibility_text: "some alt text personalized ${mc_subject}",
      image_asset: "2dc2a6b159073a2e6f7bf1664eae7eac1b56c6d8",
    };

    const subject = setUpCampaignManagerWithData(response);

    expect(
      subject.getMessageCenterCampaigns({
        "successfullypersonalized": "passing",
      })
    ).toHaveLength(2);

    const campaigns = subject.getMessageCenterCampaigns({
      "successfullypersonalized": "passing",
      "mc_subject": "test_value",
      "mc_description": "description_value",
      "mc_image": "image_value",
    });

    expect(campaigns).toHaveLength(3);
    expect(campaigns[0].message_center_details!.subject).toBe(
      "some subject personalized test_value"
    );
    expect(campaigns[0].message_center_details!.description).toBe(
      "some description personalized description_value"
    );
    expect(campaigns[0].message_center_details!.dynamic_image_url).toBe(
      "https://image_value.png"
    );
    expect(campaigns[0].message_center_details!.accessibility_text).toBe(
      "some alt text personalized test_value"
    );
    expect(campaigns[0].message!.message_center_details!.subject).toBe(
      "some subject personalized test_value"
    );
  });

  it("Can be marked as seen", () => {
    const subject = setUpCampaignManagerWithData(data);
    const campaign = subject.getMessageCenterCampaigns()[0];

    let campaignState = subject["campaignState"];

    expect(campaignState[campaign.id].status).toBe("unseen");

    subject.markCampaignAsSeen(campaign);
    campaignState = subject["campaignState"];

    expect(campaignState[campaign.id].status).toBe("seen");
  });

  it("Can be removed", () => {
    const subject = setUpCampaignManagerWithData(data);
    let campaignList = subject.getMessageCenterCampaigns();
    expect(campaignList.length).toBe(2);
    const campaign = campaignList[0];

    let campaignState = subject["campaignState"];

    expect(campaignState[campaign.id].status).toBe("unseen");

    subject.removeMessageCenterCampaign(campaign);
    campaignState = subject["campaignState"];

    expect(campaignState[campaign.id].status).toBe("deleted");

    campaignList = subject.getMessageCenterCampaigns();
    expect(campaignList.length).toBe(1);
  });

  it("Can be marked as seen by campaign id", () => {
    const subject = setUpCampaignManagerWithData(data);
    const campaign = subject.getMessageCenterCampaigns()[0];

    let campaignState = subject["campaignState"];
    expect(campaignState[campaign.id].status).toBe("unseen");

    subject.markCampaignAsSeenById(campaign.id);
    campaignState = subject["campaignState"];

    expect(campaignState[campaign.id].status).toBe("seen");
  });

  it("Can be removed by campaign id", () => {
    const subject = setUpCampaignManagerWithData(data);
    let campaignList = subject.getMessageCenterCampaigns();
    expect(campaignList.length).toBe(2);
    const campaign = campaignList[0];

    subject.removeMessageCenterCampaignById(campaign.id);
    const campaignState = subject["campaignState"];

    expect(campaignState[campaign.id].status).toBe("deleted");

    campaignList = subject.getMessageCenterCampaigns();
    expect(campaignList.length).toBe(1);
  });

  it("Ignores by-id mark/remove for unknown campaign ids", () => {
    const subject = setUpCampaignManagerWithData(data);
    // Should not throw for a non-existent id.
    subject.markCampaignAsSeenById(99999999);
    subject.removeMessageCenterCampaignById(99999999);
    expect(subject.getMessageCenterCampaigns().length).toBe(2);
  });

  it("Shows message center campaigns", () => {
    const subject = setUpCampaignManagerWithData(data);

    const mcCampaigns = subject.getMessageCenterCampaigns();
    subject.showCampaign(mcCampaigns[0]);

    const iamItem = document.getElementsByTagName("swrve-in-app-message")[0] as HTMLSwrveInAppElement;
    expect(iamItem.shadowRoot?.getElementById("swrveIAM__button-0")).not.toBeNull();
    expect(iamItem.shadowRoot?.getElementById("swrveIAM__button-1")).not.toBeNull();

  });

  it("Finds and shows embedded message center campaigns", () => {
    const embeddedCallback = jest.fn();
    const subject = setUpCampaignManagerWithData(embeddedMessageCenter);
    subject.onEmbeddedMessage(embeddedCallback);
    const mcCampaigns = subject.getMessageCenterCampaigns();
    expect(mcCampaigns).toHaveLength(1);
    expect(subject.getInAppMessageCenterCampaigns()).toHaveLength(0);
    expect(subject.getEmbeddedMessageCenterCampaigns()).toHaveLength(1);
    subject.showCampaign(mcCampaigns[0]);

    expect(embeddedCallback.mock.calls.length).toBe(1);
  });

  it("Parses triggers on construction", () => {
    storageManager.saveData(
      CAMPAIGNS + user.userId,
      JSON.stringify(campaignsOnly)
    );
    const subject = setUpCampaignManagerWithData(null);

    expect(subject["triggers"]).toHaveLength(2);
  });

  it("Parses messages on construction", () => {
    storageManager.saveData(
      CAMPAIGNS + user.userId,
      JSON.stringify(campaignsOnly)
    );
    const subject = setUpCampaignManagerWithData(null);

    /* 2 IAMs and 1 embedded */
    expect(subject["messages"]).toHaveLength(3);
  });
});

import _allOne = require("./resources/json/CampaignParserTest-all1.json");
import _allTwo = require("./resources/json/CampaignParserTest-all2.json");
import _allThree = require("./resources/json/CampaignParserTest-all3.json");
import _allFour = require("./resources/json/CampaignParserTest-all4.json");


describe("CAMPAIGN PARSER TESTS", () => {
  it("empty campaign", () => {
    const results = CampaignManager.getAllAssets([], "test.cdn");
    expect(results).toHaveLength(0);
  });

  it("campaigns with no messages", () => {
    const all: ISwrveCampaigns = _allOne as any;
    const results = CampaignManager.getAllAssets(all.campaigns, "test.cdn");

    expect(results).toHaveLength(0);
  });

  it("campaigns with 2 campaigns and 5 buttons,images", () => {
    const all: ISwrveCampaigns = _allTwo as any;
    const results = CampaignManager.getAllAssets(all.campaigns, "test.cdn");

    expect(results).toHaveLength(5);
  });

  it("campaign with missing message node in one campaign and two assets in other", () => {
    const all: ISwrveCampaigns = _allThree as any;
    const results = CampaignManager.getAllAssets(all.campaigns, "test.cdn");

    expect(results).toHaveLength(2);
  });

  it("campaign with no messages nodes", () => {
    const all: ISwrveCampaigns = _allFour as any;
    const results = CampaignManager.getAllAssets(all.campaigns, "test.cdn");

    expect(results).toHaveLength(0);
  });

  it("always sets dataRaw on embedded messages", () => {
    const subject =  setUpCampaignManagerWithData(embeddedMessageCenter);
    const messages =  subject.getEmbeddedMessageCenterCampaigns();
    
    expect(messages[0].dataRaw).toBe(messages[0].data);
  });
});
