import PAL from "../src/utils/PAL";
import { Swrve } from "../src/Swrve";
import { MockSwrveRestClient } from "./mocks/MockSwrveRestClient";
import { ISwrveConfig } from "../src/interfaces/ISwrveConfig";
import {
  NETWORK_CONNECTED,
  NetworkListener,
  IPlatform,
} from "../src/interfaces/IPlatform";
import IIdentityResponse from "../src/interfaces/IIdentityResponse";
import {
  EXISTING_EXTERNAL_ID,
  SWRVE_IAM_CONTAINER,
  SWRVE_OVERLAY_CONTAINER,
  SWRVE_USER_ID_NO_PREFIX,
} from "../src/utils/SwrveConstants";
import { ProfileManager } from "../src/Profile/ProfileManager";
import SwrveLogger from "../src/utils/SwrveLogger";
import { StorageManager } from "../src/Storage/StorageManager";
import PlatformMock from "./mocks/PlatformMock";
import { SwrveCoreSDK } from "../src/SwrveCoreSDK";

const twoDays = 172800000;

import _newUserData = require("./resources/json/IdentityTest-newExternalId.json");
const newUserData: IIdentityResponse = _newUserData as any;
import _secondNewUserData = require("./resources/json/IdentityTest-newExternalId-second.json");
const secondNewUserData: IIdentityResponse = _secondNewUserData as any;
import _existingExternalId = require("./resources/json/IdentityTest-ExistingExternalId.json");
const existingExternalId = _existingExternalId as any;
import errorInvalidAPI = require("./resources/json/IdentityTest-Error403.json");

import _campaigns = require("./resources/json/IdentityTests-campaigns.json");
const campaigns = _campaigns as any;
campaigns.campaigns.campaigns[0].start_date = Date.now() - twoDays;
campaigns.campaigns.campaigns[0].end_date = Date.now() + twoDays;

import _passes = require("./resources/json/IdentityTests-passes.json");
const passes = _passes as any;
passes.campaigns.campaigns[0].start_date = Date.now() - twoDays;
passes.campaigns.campaigns[0].end_date = Date.now() + twoDays;

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

describe("Identity Tests", () => {
  jest.spyOn(SwrveCoreSDK, "getPlatform").mockReturnValue(new PlatformMock());

  const platform = PAL.getPlatform();
  const storageManager = new StorageManager(platform);
  const restClient = new MockSwrveRestClient();

  const setUpAndInitializeSDK = (withPreviousUser = false) => {
    if (withPreviousUser) {
      storageManager.saveData(SWRVE_USER_ID_NO_PREFIX, "SwrveDevice");
    }
    const sdk = new Swrve(
      { appId: 1111, apiKey: "1234" },
      { restClient, platform }
    );
    sdk.init();
    return sdk;
  };

  beforeEach(() => {
    platform.synchronousStorage.clear();
  });

  it("calls back to error handler", (done) => {
    const sdk = setUpAndInitializeSDK();
    restClient.changeResponse({ status: 403, json: () => errorInvalidAPI });

    const errorHandler = (error: any) => {
      expect(error.code).toEqual(403);
      done();
    };

    sdk.init();
    sdk.identify("abc", () => {}, errorHandler);
  });

  it("handles empty thirdPartyLogin Id", (done) => {
    //set up a "previous" user
    const sdk = setUpAndInitializeSDK(true);
    restClient.changeResponse({ json: () => newUserData });

    const firstUser = sdk["profileManager"].currentUser.userId;
    expect(firstUser).toBe("SwrveDevice");

    setTimeout(() => {
      const queueEvent = jest.fn();
      sdk["evtManager"].queueEvent = queueEvent;

      //send empty request, should get a new UUID from SwrveDevice
      sdk.identify("", () => {}, () => {});
      const secondUser = sdk["profileManager"].currentUser.userId;

      setTimeout(() => {
        expect(queueEvent.mock.calls[0][0].type).toBe("session_start");
        expect(queueEvent.mock.calls[1][0].name).toBe("Swrve.first_session");
        expect(firstUser).not.toEqual(secondUser);
        expect(secondUser).not.toEqual("SwrveDevice");
        expect(sdk["pauseSDK"]).toBeFalsy; //toBe(false) if fails
        expect(storageManager.getData(SWRVE_USER_ID_NO_PREFIX)).toBe(
          secondUser
        );
        expect(sdk.profileManager.currentUser.sessionToken).toContain(
          secondUser
        );
        expect(sdk.profileManager.currentUser.sessionToken).not.toContain(
          firstUser
        );

        // current user should have the correct externalUserId associated with it
        expect(sdk.profileManager.currentUser.externalUserId).toBeUndefined;

        done();
      }, 100);
    }, 1000);
  });

  it("handles null thirdPartyLogin Id", (done) => {
    const sdk = setUpAndInitializeSDK(true);
    restClient.changeResponse({ json: () => newUserData });

    const firstUser = sdk["profileManager"].currentUser.userId;
    expect(firstUser).toBe("SwrveDevice");

    setTimeout(() => {
      const queueEvent = jest.fn();
      sdk["evtManager"].queueEvent = queueEvent;

      sdk.identify(null, () => {}, () => {});
      const secondUser = sdk["profileManager"].currentUser.userId;

      setTimeout(() => {
        expect(queueEvent.mock.calls[0][0].type).toEqual("session_start");
        expect(queueEvent.mock.calls[1][0].name).toEqual("Swrve.first_session");
        expect(firstUser).not.toEqual(secondUser);
        expect(secondUser).not.toEqual("SwrveDevice");
        expect(sdk["pauseSDK"]).toBeFalsy;
        expect(storageManager.getData(SWRVE_USER_ID_NO_PREFIX)).toBe(
          secondUser
        );
        expect(sdk.profileManager.currentUser.sessionToken).toContain(
          secondUser
        );
        expect(sdk.profileManager.currentUser.sessionToken).not.toContain(
          firstUser
        );

        // current user should have the correct externalUserId associated with it
        expect(sdk.profileManager.currentUser.externalUserId).toBeUndefined;

        done();
      }, 100);
    }, 1000);
  });

  it("handles first login with new_external_id", (done) => {
    const sdk = setUpAndInitializeSDK(true);
    restClient.changeResponse({ json: () => newUserData });

    setTimeout(() => {
      sdk.event("test", { a: 1 });

      setTimeout(() => {
        const queueEvent = jest.fn();
        sdk["evtManager"].queueEvent = queueEvent;

        sdk.identify("thirdPartyId",() => {}, () => {});
        const profileManager = sdk["profileManager"];

        setTimeout(() => {
          // there should be no events sent since this was anonymous
          expect(queueEvent).not.toBeCalled;

          expect(profileManager.currentUser.userId).toEqual("SwrveDevice");
          expect(sdk["pauseSDK"]).toBeFalsy;

          // current user should have the correct externalUserId associated with it
          expect(profileManager.currentUser.externalUserId).toBe("thirdPartyId");

          // new third party id should be cached with swrveid
          const cachedId = storageManager.getData("ext-thirdPartyId");
          expect(cachedId).toBe("SwrveDevice");
          expect(storageManager.getData(SWRVE_USER_ID_NO_PREFIX)).toBe(
            "SwrveDevice"
          );

          // SwrveID should be saved as verified
          const verifiedSwrveId = storageManager.getData(
            "verified-SwrveDevice"
          );
          expect(verifiedSwrveId).toBe("VERIFIED");

          //session token should be changed appropriately
          expect(sdk.profileManager.currentUser.sessionToken).toContain(
            "SwrveDevice"
          );

          done();
        }, 100);
      }, 800);
    }, 1000);
  });

  it("handles second login same device with new_external_id", (done) => {
    const sdk = setUpAndInitializeSDK(true);
    restClient.changeResponse({ json: () => secondNewUserData });

    // Set the current SwrveID as already verified and existing
    storageManager.saveData("ext-thirdPartyId", "SwrveDevice");
    sdk.profileManager.setUserIdAsVerified("SwrveDevice");

    // Ensure we have the SwrveDevice set as the previousUserId to verify the logic
    sdk.profileManager.setCurrentUser("SwrveDevice", false);

    setTimeout(() => {
      sdk.event("test", { a: 1 });

      setTimeout(() => {
        const queueEvent = jest.fn();
        sdk["evtManager"].queueEvent = queueEvent;

        sdk.identify("secondPartyId", () => {}, () => {});
        const profileManager = sdk["profileManager"];

        setTimeout(() => {
          // session token should be changed appropriately
          expect(profileManager.currentUser.sessionToken).toContain(
            "SecondDeviceId"
          );

          // session_start, first_session and device_update should have been called (in that order)
          expect(queueEvent).toBeCalledTimes(3);
          expect(queueEvent.mock.calls[0][0].type).toEqual("session_start");
          expect(queueEvent.mock.calls[1][0].name).toEqual(
            "Swrve.first_session"
          );
          expect(queueEvent.mock.calls[2][0].type).toEqual("device_update");

          expect(profileManager.currentUser.userId).toBe("SecondDeviceId");

          // new third party id should be cached with swrveid
          const cachedId = storageManager.getData("ext-secondPartyId");
          expect(cachedId).toBe("SecondDeviceId");
          expect(storageManager.getData(SWRVE_USER_ID_NO_PREFIX)).toBe(
            "SecondDeviceId"
          );

          // current user should have the correct externalUserId associated with it
          expect(profileManager.currentUser.externalUserId).toBe("secondPartyId");

          // SwrveID should be saved as verified
          const verifiedSwrveId = storageManager.getData(
            "verified-SecondDeviceId"
          );
          expect(verifiedSwrveId).toBe("VERIFIED");

          done();
        }, 100);
      }, 800);
    }, 1000);
  });

  it("handles cached third party user that is not current user", (done) => {
    restClient.changeResponse({ json: () => newUserData });
    storageManager.saveData("ext-cachedUser123", "swrveUser123");
    const sdk = setUpAndInitializeSDK();

    setTimeout(() => {
      const queueEvent = jest.fn();
      sdk["evtManager"].queueEvent = queueEvent;

      sdk.identify("cachedUser123",() => {}, () => {});

      setTimeout(() => {
        expect(queueEvent.mock.calls[0][0].type).toBe("session_start");
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

  it("handles cached third party user that is current user", (done) => {
    restClient.changeResponse({ json: () => newUserData });
    storageManager.saveData("ext-cachedUser123", "swrveUser123");
    storageManager.saveData(SWRVE_USER_ID_NO_PREFIX, "swrveUser123");
    const sdk = setUpAndInitializeSDK();

    setTimeout(() => {
      const queueEvent = jest.fn();
      sdk["evtManager"].queueEvent = queueEvent;

      sdk.identify("cachedUser123", () => {}, () => {});

      expect(queueEvent).not.toBeCalled();
      expect(sdk.profileManager.currentUser.userId).toBe("swrveUser123");
      expect(sdk.profileManager.currentUser.sessionToken).toContain(
        "swrveUser123"
      );
      expect(sdk["pauseSDK"]).toBeFalsy;
      expect(sdk.profileManager.currentUser.externalUserId).toBe("cachedUser123");
      done();
    }, 1500);
  });

  it("handles existing external id", (done) => {
    restClient.changeResponse({ json: () => existingExternalId });
    storageManager.saveData(SWRVE_USER_ID_NO_PREFIX, "swrveUser123");
    const sdk = setUpAndInitializeSDK();

    setTimeout(() => {
      const queueEvent = jest.fn();
      sdk["evtManager"].queueEvent = queueEvent;

      sdk.identify("testId", () => {}, () => {});
      setTimeout(() => {
        expect(queueEvent.mock.calls[0][0].type).toBe("session_start");
        expect(sdk.profileManager.currentUser.userId).toBe("originalId");
        expect(sdk.profileManager.currentUser.sessionToken).toContain(
          "originalId"
        );
        expect(sdk["pauseSDK"]).toBeFalsy;
        expect(sdk.profileManager.currentUser.externalUserId).toBe("testId");
        done();
      }, 200);
    }, 1500);
  });

  it("switches campaign state when switching users", (done) => {
    jest
      .spyOn(Swrve.prototype as any, "getCampaignsAndResources")
      .mockImplementation(() => {
        return Promise.resolve({ data: passes, etag: "123" });
      });
    storageManager.saveData(SWRVE_USER_ID_NO_PREFIX, "swrveUser123");
    const sdk = setUpAndInitializeSDK();

    setTimeout(() => {
      sdk.event("tv.event_simple", { a: 1 });
      setTimeout(() => {
        let state = sdk["campaignManager"]["campaignState"];
        expect(state[315415]["impressions"]).toEqual(1);

        // change response just before identify
        restClient.changeResponse({ json: () => existingExternalId });
        sdk.identify("testId", () => {}, () => {});

        setTimeout(() => {
          state = sdk["campaignManager"]["campaignState"];
          expect(state[315415]["impressions"]).toEqual(0);
          done();
        }, 200);
      }, 500);
    });
  });

  it("shows session start IAM after switching users", (done) => {
    jest.spyOn(Swrve.prototype as any, "getCampaignsAndResources")
      .mockImplementation(() =>
        Promise.resolve({ data: campaigns, etag: "123" })
      );
    const platform = new PlatformMock();
    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform }
    );
    sdk.init();
    

    setTimeout(() => {
      // make sure we have a different user before we switch so it's a proper one
      expect(sdk["profileManager"].currentUser.userId).not.toBe("SwrveUser489");

      moveIAMOffscreen();
      cleanUpDom();
      const campaignManager = sdk["campaignManager"];
      jest
        .spyOn(campaignManager.getAssetManager(), "checkAssetsForCampaign")
        .mockReturnValue(true);
      campaignManager.closeMessage();

      setTimeout(() => {
        let response = {
          status: EXISTING_EXTERNAL_ID,
          swrve_id: "SwrveUser489",
        };
        restClient.changeResponse({ json: () => response });

        sdk.identify("test", () => {}, (error) => {});

        moveIAMOffscreen();

        setTimeout(() => {
          expect(sdk["profileManager"].currentUser.userId).toBe("SwrveUser489");
          expect(sdk["profileManager"].currentUser.sessionToken).toContain("SwrveUser489");

          const container = document.getElementById(SWRVE_OVERLAY_CONTAINER);
          expect(container).not.toBeNull();
          cleanUpDom();
          done();
        }, 1000);
      }, 500);
    }, 1000);
  });

  it("Does not queue 'Swrve.first_session' if new user has already identified on other device", (done) => {
    restClient.changeResponse({ json: () => existingExternalId });
    storageManager.saveData(SWRVE_USER_ID_NO_PREFIX, "swrveUser123");
    const sdk = setUpAndInitializeSDK();

    setTimeout(() => {
      const queueEvent = jest.fn();
      sdk["evtManager"].queueEvent = queueEvent;
      sdk.identify("testId", () => {}, () => {});

      setTimeout(() => {
        // session token should be changed appropriately
        expect(sdk.profileManager.currentUser.sessionToken).toContain(
          "originalId"
        );

        // session_start and device_update should have been called (in that order)
        expect(queueEvent).toBeCalledTimes(2);
        expect(queueEvent.mock.calls[0][0].type).toBe("session_start");

        // Ensure there is no first_session in the second argument
        expect(queueEvent.mock.calls[1][0].name).not.toBe(
          "Swrve.first_session"
        );

        // There should be a device_update there
        expect(queueEvent.mock.calls[1][0].type).toBe("device_update");

        expect(sdk.profileManager.currentUser.userId).toBe("originalId");

        // new third party id should be cached with swrveid
        const cachedId = storageManager.getData("ext-testId");
        expect(cachedId).toBe("originalId");
        expect(storageManager.getData(SWRVE_USER_ID_NO_PREFIX)).toBe(
          "originalId"
        );

        // SwrveID should be saved as verified
        const verifiedSwrveId = storageManager.getData("verified-originalId");
        expect(verifiedSwrveId).toBe("VERIFIED");
        done();
      }, 200);
    }, 1500);
  });
});
