import { Swrve } from "../src/Swrve";
import { SwrveCoreSDK } from "../src/SwrveCoreSDK";
import { SWRVE_USER_ID_NO_PREFIX } from "../src/utils/SwrveConstants";
import IIdentityResponse from "../src/interfaces/IIdentityResponse";
import { MockSwrveRestClient } from "./mocks/MockSwrveRestClient";
import { ISwrveCampaignResourceResponse } from "../src/interfaces/ISwrveCampaign";
import PlatformMock from "./mocks/PlatformMock";

import _passes = require("./resources/json/SwrveSDKTests-passes.json");
import { StorageManager } from "../src/Storage/StorageManager";
const twoDays = 172800000;

import _newUserData = require("./resources/json/IdentityTest-newExternalId.json");
const newUserData: IIdentityResponse = _newUserData as any;
import _secondNewUserData = require("./resources/json/IdentityTest-newExternalId-second.json");
const secondNewUserData: IIdentityResponse = _secondNewUserData as any;
import _existingExternalId = require("./resources/json/IdentityTest-ExistingExternalId.json");
const existingExternalId = _existingExternalId as any;

const passes: ISwrveCampaignResourceResponse = _passes as any;
passes.campaigns.campaigns[0].start_date = Date.now() - twoDays;
passes.campaigns.campaigns[0].end_date = Date.now() + twoDays;

describe("SwrveSDK non-Anonymous mode tests", () => {
  const pal = new PlatformMock();
  jest.spyOn(SwrveCoreSDK, "getPlatform").mockReturnValue(pal);
  const storageManager = new StorageManager(pal);
  const restClient = new MockSwrveRestClient();

  jest.spyOn(pal, "name").mockReturnValue({
    name: "Browser",
    variation: "Web",
  });

  it("starts with pre-existing external id the SDK", (done) => {
    restClient.changeResponse({ json: () => existingExternalId });

    const sdk = new Swrve(
      { appId: 1111, apiKey: "1234", externalUserId: "test" },
      { restClient, platform: pal }
    );

    sdk.init();

    const queueEvent = jest.fn();
    sdk["evtManager"].queueEvent = queueEvent;

    setTimeout(() => {
      expect(queueEvent.mock.calls[0][0].type).toBe("device_update");
      expect(queueEvent.mock.calls[1][0].type).toBe("session_start");
      expect(sdk["pauseSDK"]).toBeFalsy;
      expect(storageManager.getData(SWRVE_USER_ID_NO_PREFIX)).toBe(
        "originalId"
      );
      expect(sdk.profileManager.currentUser.sessionToken).toContain(
        "originalId"
      );

      // current user should have the correct externalUserId associated with it
      expect(sdk.profileManager.currentUser.externalUserId).toBeDefined;
      expect(sdk.profileManager.currentUser.isAnonymous).toBeFalsy;
      expect(sdk.profileManager.currentUser.externalUserId).toBe("test");
      done();
    }, 100);
  });

  it("successful new_external_id should start", (done) => {
    restClient.changeResponse({ json: () => newUserData });

    //set it as the first user
    storageManager.saveData(SWRVE_USER_ID_NO_PREFIX, "SwrveDevice");

    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234", externalUserId: "newExternalID" },
      { restClient, platform: pal }
    );

    const firstUser = sdk["profileManager"].currentUser.userId;
    expect(firstUser).toBe("SwrveDevice");

    sdk.init();

    const queueEvent = jest.fn();
    sdk["evtManager"].queueEvent = queueEvent;

    setTimeout(() => {
      expect(storageManager.getData(SWRVE_USER_ID_NO_PREFIX)).toBe(
        "SwrveDevice"
      );
      expect(sdk.profileManager.currentUser.sessionToken).toContain(
        "SwrveDevice"
      );

      expect(sdk["pauseSDK"]).toBeFalsy;

      expect(queueEvent.mock.calls[0][0].type).toBe("session_start");
      expect(queueEvent.mock.calls[1][0].name).toBe("Swrve.first_session");

      // current user should have the correct externalUserId associated with it
      expect(sdk.profileManager.currentUser.externalUserId).toBeDefined;
      expect(sdk.profileManager.currentUser.isAnonymous).toBeFalsy;
      expect(sdk.profileManager.currentUser.externalUserId).toBe(
        "newExternalID"
      );
      done();
    }, 100);
  });

  it("starts with a cached user that successfully identified before", (done) => {
    restClient.changeResponse({ json: () => newUserData });
    storageManager.saveData("ext-cachedUser123", "swrveUser123");

    // make sure current user doesn't match the new one
    storageManager.saveData(SWRVE_USER_ID_NO_PREFIX, "SwrveDevice");

    const sdk = new Swrve(
      { appId: 1111, apiKey: "1234", externalUserId: "cachedUser123" },
      { restClient, platform: pal }
    );

    setTimeout(() => {
      const queueEvent = jest.fn();
      sdk["evtManager"].queueEvent = queueEvent;

      sdk.identify(
        "cachedUser123",
        () => {},
        () => {}
      );

      setTimeout(() => {
        expect(queueEvent.mock.calls[0][0].type).toBe("device_update");
        expect(sdk.profileManager.currentUser.userId).toBe("swrveUser123");
        expect(sdk.profileManager.currentUser.sessionToken).toContain(
          "swrveUser123"
        );
        expect(sdk["pauseSDK"]).toBeFalsy;
        expect(storageManager.getData(SWRVE_USER_ID_NO_PREFIX)).toBe(
          "swrveUser123"
        );
        done();
      }, 100);
    }, 1500);
  });

  it("SDK does not start on unsuccessful identification", (done) => {
    restClient.changeResponse({
      throwsNetworkError: () => {
        throw new Error("TypeError: Failed to fetch");
      },
    });

    const sdk = new Swrve(
      { appId: 1111, apiKey: "1234", externalUserId: "failed_external" },
      { restClient, platform: pal }
    );

    const queueEvent = jest.fn();
    sdk["evtManager"].queueEvent = queueEvent;
    sdk.init();
    setTimeout(() => {
      expect(queueEvent.mock.calls.length).toBe(0);
      expect(sdk["pauseSDK"]).toBeTruthy;
      done();
    }, 100);
  });

  it("External User Id must be set to config or it will not start", () => {
    const sdk = new Swrve(
      { appId: 1111, apiKey: "1234" },
      { restClient, platform: pal }
    );
      expect(() => {
        sdk.init();
      }).toThrowError(
        "ExternalUserId must be set in config for non-anonymous tracking"
      );
  });

});
