import { CampaignManager } from "../src/Campaigns/CampaignManager";
import {
  ISwrveCampaignResourceResponse,
  ISwrveCampaigns,
} from "../src/interfaces/ISwrveCampaign";
import { StorageManager } from "../src/Storage/StorageManager";
import { ProfileManager } from "../src/Profile/ProfileManager";
import { SwrveCoreSDK } from "../src/SwrveCoreSDK";
import {
  SWRVE_IAM_CONTAINER,
  CAMPAIGN_STATE,
  CAMPAIGNS,
} from "../src/utils/SwrveConstants";
import { Swrve } from "../src/Swrve";
import { MockSwrveRestClient } from "./mocks/MockSwrveRestClient";
import PlatformMock from "./mocks/PlatformMock";

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
const embeddedMessageCenter: ISwrveCampaignResourceResponse = _embeddedMessageCenter as any;

import _passes = require("./resources/json/CampaignManagerTests-passes.json");
const passes: ISwrveCampaignResourceResponse = _passes as any;
passes.campaigns.campaigns[0].start_date = Date.now() - twoDays;
passes.campaigns.campaigns[0].end_date = Date.now() + twoDays;

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

const moveIAMOffscreen = () => {
  const container = document.getElementById(SWRVE_IAM_CONTAINER);

  if (container) {
    container.style.left = "-10000px";
  }
};

const setUpCampaignManagerWithData = (initialData: any) => {
  const campaignManager = new CampaignManager(
    profileManager,
    platform,
    storageManager
  );

  if (initialData) {
    campaignManager.storeCampaigns(initialData, () => {});
  }

  return campaignManager;
};

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

    subject.storeCampaigns(changedData, () => {});
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

  it("Gets message center campaigns", () => {
    const subject = setUpCampaignManagerWithData(data);

    expect(subject.getMessageCenterCampaigns()).toHaveLength(2);
  });

  it("Gets empty message center campaigns", () => {
    const subject = setUpCampaignManagerWithData(noMessageCenterCampaigns);

    expect(subject.getMessageCenterCampaigns()).toHaveLength(0);
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
  

  it("Shows message center campaigns", () => {
    const subject = setUpCampaignManagerWithData(data);

    const mcCampaigns = subject.getMessageCenterCampaigns();
    subject.showCampaign(mcCampaigns[0]);
    moveIAMOffscreen();

    expect(document.getElementById(SWRVE_IAM_CONTAINER)).not.toBeNull();
  });

  it("Finds and shows embedded message center campaigns", () => {
    const embeddedCallback = jest.fn();
    const subject = setUpCampaignManagerWithData(embeddedMessageCenter);
    subject.onEmbeddedMessage(embeddedCallback);
    const mcCampaigns = subject.getMessageCenterCampaigns();
    expect(mcCampaigns).toHaveLength(1);
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
    const results = CampaignManager.getAllAssets([]);
    expect(results).toHaveLength(0);
  });

  it("campaigns with no messages", () => {
    const all: ISwrveCampaigns = _allOne as any;
    const results = CampaignManager.getAllAssets(all.campaigns);

    expect(results).toHaveLength(0);
  });

  it("campaigns with 2 campaigns and 5 buttons,images", () => {
    const all: ISwrveCampaigns = _allTwo as any;
    const results = CampaignManager.getAllAssets(all.campaigns);

    expect(results).toHaveLength(5);
  });

  it("campaign with missing message node in one campaign and two assets in other", () => {
    const all: ISwrveCampaigns = _allThree as any;
    const results = CampaignManager.getAllAssets(all.campaigns);

    expect(results).toHaveLength(2);
  });

  it("campaign with no messages nodes", () => {
    const all: ISwrveCampaigns = _allFour as any;
    const results = CampaignManager.getAllAssets(all.campaigns);

    expect(results).toHaveLength(0);
  });
});
