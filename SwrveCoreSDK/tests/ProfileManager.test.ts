import { ProfileManager } from "../src/Profile/ProfileManager";
import { StorageManager } from "../src/Storage/StorageManager";
import { Swrve } from "../src/Swrve";
import { EventManager } from "../src/Events/EventManager";
import { ISwrveCampaignResourceResponse } from "../src/interfaces/ISwrveCampaign";
import { SwrveCoreSDK } from "../src/SwrveCoreSDK";
import PlatformMock from "./mocks/PlatformMock";
import { MockSwrveRestClient } from "./mocks/MockSwrveRestClient";

import _qaUserNode = require("./resources/json/ProfileManagerTests-qaUserNode.json");
const qaUserNode: ISwrveCampaignResourceResponse = _qaUserNode as any;

import _removeQAUser = require("./resources/json/ProfileManagerTests-removeQAUser.json");
const removeQAUser: ISwrveCampaignResourceResponse = _removeQAUser as any;

jest.spyOn(SwrveCoreSDK, "getPlatform").mockReturnValue(new PlatformMock());
const platform = new PlatformMock();
const storageManager = new StorageManager(platform);
const restClient: MockSwrveRestClient = new MockSwrveRestClient();

describe("ProfileManager User Tests", () => {
  let subject: ProfileManager;

  beforeEach(() => {
    subject = new ProfileManager("1234", 30512, "1234", 1000, storageManager);
  })

  it("Creates User correctly", () => {
    expect(subject.currentUser.userId).toBe("1234");
    expect(subject.currentUser.sessionToken).not.toBe(null);
  });

  it("Increases next seq num by 1", () => {
    const currentNum = subject.currentUser.nextSeqNum;
    expect(currentNum + 1).toEqual(subject.getNextSequenceNumber());
  });
});

describe("ProfileManager QAUser Tests", () => {
  let subject: ProfileManager;

  beforeEach(() => {
    subject = new ProfileManager("1234", 30512, "1234", 1000, storageManager);
    subject.setAsQAUser(qaUserNode.qa!);
  })

  it("Creates QAUser correctly", () => {
    expect(subject.isQAUser()).toBe(true);
    expect(subject.QAUser!.reset_device_state).toBe(true);
    expect(subject.QAUser!.logging).toBe(true);
  });

  it("gets Next Sequence number", () => {
    const currSeqNum = subject.getNextSequenceNumber();
    const nextSeqNum = subject.getNextSequenceNumber();
    expect(nextSeqNum).toBe(currSeqNum + 1);
  });

  it("stores qa user in local storage correctly", () => {
    subject = new ProfileManager("1234", 30512, "1234", 1000, storageManager);
    expect(subject.isQAUser()).toBe(true);
  });

  it("removes QA user", (done) => {
    restClient.changeResponse({ json: () => qaUserNode });
    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform }
    );
    sdk.init();

    sdk.onCampaignLoaded(() => {
      expect(sdk.profileManager.isQAUser()).toBe(true);
      restClient.changeResponse({ json: () => removeQAUser });

      sdk.onCampaignLoaded(() => {
        expect(sdk.profileManager.isQAUser()).toBe(false);
        sdk.shutdown();
        done();
      });
      sdk.updateCampaignsAndResources();
    });
  });
});
