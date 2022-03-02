import { Swrve } from "../src/Swrve";
import { RealTimeUserPropertiesManager } from "../src/UserProperties/RealTimeUserPropertiesManager";
import { StorageManager } from "../src/Storage/StorageManager";
import { ProfileManager } from "../src/Profile/ProfileManager";
import PlatformMock from "./mocks/PlatformMock";
import { ISwrveCampaignResourceResponse } from "../src/interfaces/ISwrveCampaign";
import { REAL_TIME_USER_PROPERTIES } from "../src/utils/SwrveConstants";
import MockSwrveRestClient from "./mocks/MockSwrveRestClient";

import _userContent = require("./resources/json/RealTimeUserPropertiesData.json");
import IDictionary from "../src/interfaces/IDictionary";

const userContent: ISwrveCampaignResourceResponse = _userContent as any;
const userId = "SwrveUser";
const appId = 1030;
const apiKey = "api-key-1030";
const platform = new PlatformMock();
const storageManager = new StorageManager(platform);
const profileManager = new ProfileManager(
  userId,
  appId,
  apiKey,
  1000,
  storageManager
);
const restClient = new MockSwrveRestClient();

describe("REAL TIME USER PROPERTIES MANAGER TESTS", () => {
  let subject: RealTimeUserPropertiesManager;

  beforeEach(() => {
    platform.synchronousStorage.clear();
    subject = new RealTimeUserPropertiesManager(profileManager, storageManager);
  });

  it("stores user properties to local storage", () => {
    subject.storeUserProperties(userContent);

    const storedUserProperties = JSON.parse(
      storageManager.getData(`${REAL_TIME_USER_PROPERTIES}${userId}`)!
    );
    expect(storedUserProperties).toEqual(userContent.real_time_user_properties);
  });

  it("parses user properties on construction", () => {
    storageManager.saveData(
      `${REAL_TIME_USER_PROPERTIES}${userId}`,
      JSON.stringify(userContent.real_time_user_properties)
    );
    subject = new RealTimeUserPropertiesManager(profileManager, storageManager);

    expect(subject.UserProperties).toEqual(
      userContent.real_time_user_properties
    );
  });

  it("stores user properties between sessions", (done) => {
    storageManager.saveData("user_id", userId);
    restClient.changeResponse({ json: () => userContent });

    const sdk = new Swrve({ appId, apiKey }, { restClient, platform });
    sdk.init();

    setTimeout(() => {
      const storedUserProperties = JSON.parse(
        storageManager.getData(`${REAL_TIME_USER_PROPERTIES}${userId}`)!
      );

      expect(storedUserProperties).not.toBeNull;
      expect(storedUserProperties).toEqual(
        userContent.real_time_user_properties
      );

      sdk.shutdown();

      sdk.init();

      setTimeout(() => {
        const storedUserProperties = JSON.parse(
          storageManager.getData(`${REAL_TIME_USER_PROPERTIES}${userId}`)!
        );

        expect(storedUserProperties).not.toBeNull;
        expect(storedUserProperties).toEqual(
          userContent.real_time_user_properties
        );
        done();
      }, 200);
    }, 400);
  });

  it("user properties are returned by getRealTimeUserProperties call", (done) => {
    restClient.changeResponse({ json: () => userContent });

    const sdk = new Swrve({ appId, apiKey }, { restClient, platform });
    sdk.init();

    setTimeout(() => {
      expect(sdk.getRealTimeUserProperties()).toEqual(
        userContent.real_time_user_properties
      );
      done();
    }, 500);
  });

  it("user properties can be processed as a static function from the manager", () => {
    const rtupsDictionary = { test: "value", test2: "value2"} as IDictionary<string>;
    const resultRTUPs = RealTimeUserPropertiesManager.processForPersonalization(rtupsDictionary);
    expect(resultRTUPs["user.test"]).toBe("value")
    expect(resultRTUPs["user.test2"]).toBe("value2")
    expect(resultRTUPs["test"]).toBeUndefined();
    expect(resultRTUPs["test2"]).toBeUndefined();

  });
});
