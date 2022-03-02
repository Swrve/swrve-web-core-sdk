import { MockSwrveRestClient } from "./mocks/MockSwrveRestClient";
import PlatformMock from "./mocks/PlatformMock";
import { SwrveResource } from "../src/Resources/SwrveResource";
import {
  ISwrveCampaignResourceResponse,
  IUserResource,
} from "../src/interfaces/ISwrveCampaign";
import { Swrve } from "../src/Swrve";
import { ResourceManagerInternal } from "../src/Resources/ResourceManagerInternal";
import { StorageManager } from "../src/Storage/StorageManager";
import { SwrveCoreSDK } from "../src/SwrveCoreSDK";

import _userResources = require("./resources/json/ResourceManagerTests-userResources.json");
const userResources: ReadonlyArray<IUserResource> = _userResources as any;

import _campaignResourceResponse = require("./resources/json/ResourceManagerTests-campaignResourceResponse.json");
const campaignResourceResponse: ISwrveCampaignResourceResponse =
  _campaignResourceResponse as any;

campaignResourceResponse.user_resources = userResources;

describe("RESOURCE MANAGER TESTS", () => {
  jest.spyOn(SwrveCoreSDK, "getPlatform").mockReturnValue(new PlatformMock());

  const userId = "SwrveDevice";
  const platform = new PlatformMock();
  const storageManager = new StorageManager(platform);
  const restClient = new MockSwrveRestClient();
  let subject: ResourceManagerInternal;

  const setUpAndInitializeSDK = () => {
    const sdk = new Swrve(
      { appId: 30512, apiKey: "1234" },
      { restClient, platform }
    );
    sdk.init();
    return sdk;
  };

  beforeEach(() => {
    platform.synchronousStorage.clear();
    subject = new ResourceManagerInternal(storageManager);
  });

  it("Resources are stored correctly", () => {
    subject.storeResources(userResources, userId);
    const storedResources = subject.getResourceManager().getResources();

    expect(storedResources!.length).toBe(13);
    expect(storedResources![0].name).toBe("tv.demoapp.main.scene");
  });

  it("Returned resources are a copy", () => {
    subject.storeResources(userResources, userId);
    const storedResources = subject.getResourceManager().getResources();

    const firstResource = storedResources![0];
    firstResource.name = "Test name";
    const resource = subject
      .getResourceManager()
      .getResource(firstResource.uid);
    const name1 = firstResource.name;
    const name2 = resource.getAttributeAsString("name", "");

    expect(name1).not.toBe(name2);
  });

  it("Resources with mismatched MD5 returns null", async () => {
    subject.storeResources(userResources, userId);
    storageManager.saveData(`resources${userId}`, "{a:1}");

    return subject.getResources(userId).then((resources) => {
      expect(resources).toBe(null);
      expect(subject.getResourceManager().getResources()).toBe(null);
    });
  });

  it("Resources are returned by getResources call", (done) => {
    restClient.changeResponse({ json: () => campaignResourceResponse });
    const sdk = setUpAndInitializeSDK();

    setTimeout(() => {
      sdk.getResources((resources) => {
        expect(resources).not.toBe(null);
        done();
      });
    }, 500);
  });

  it("getResources returns empty array when no resources are available", (done) => {
    restClient.changeResponse({ json: () => {} });
    const sdk = setUpAndInitializeSDK();

    setTimeout(() => {
      sdk.getResources((resources) => {
        expect(resources).toEqual([]);
        done();
      });
    }, 10);
  });

  it("getResources returns empty array when resource fetch fails", (done) => {
    restClient.changeResponse({ status: 500 });
    const sdk = setUpAndInitializeSDK();

    setTimeout(() => {
      sdk.getResources((resources) => {
        expect(resources).toEqual([]);
        done();
      });
    }, 10);
  });

  it("provides getResource and getAttributeAsX", () => {
    subject.storeResources(
      [
        {
          uid: "1",
          name: "abc",
          num: "3",
          bool: "yes",
        },
      ],
      userId
    );

    const manager = subject.getResourceManager();

    expect(manager.getAttributeAsString("1", "name", "")).toBe("abc");
    expect(manager.getResource("1").getAttributeAsString("name", "")).toBe(
      "abc"
    );

    expect(manager.getAttributeAsNumber("1", "num", 0)).toBe(3);
    expect(manager.getResource("1").getAttributeAsNumber("num", 3)).toBe(3);

    expect(manager.getAttributeAsBoolean("1", "bool", false)).toBe(true);
    expect(manager.getResource("1").getAttributeAsBoolean("bool", false)).toBe(
      true
    );
  });

  it("non-existing resource works with default values", () => {
    subject.storeResources([], userId);

    const manager = subject.getResourceManager();

    expect(manager.getResource("x").getAttributeAsString("y", "123")).toBe(
      "123"
    );
    expect(manager.getAttributeAsNumber("x", "y", 5)).toBe(5);
  });

  it("uses refreshed values in existing resource manager instance", () => {
    subject.storeResources(
      [
        {
          uid: "1",
          name: "abc",
        },
      ],
      userId
    );

    const manager = subject.getResourceManager();
    expect(manager.getAttributeAsString("1", "name", "")).toBe("abc");

    subject.storeResources(
      [
        {
          uid: "1",
          name: "xyz",
        },
      ],
      userId
    );

    expect(manager.getAttributeAsString("1", "name", "")).toBe("xyz");
    expect(
      subject.getResourceManager().getAttributeAsString("1", "name", "")
    ).toBe("xyz");
  });
});

describe("SwrveResource", () => {
  let subject: SwrveResource;

  describe("getAttributeAsString", () => {
    it("getAttributeAsString", () => {
      const subject = new SwrveResource({ name: "abc" });
      expect(subject.getAttributeAsString("name", "xyz")).toBe("abc");
    });

    it("returns default value for getAttributeAsString with missing keys", () => {
      const subject = new SwrveResource({ name: "abc" });
      expect(subject.getAttributeAsString("missing-key", "xyz")).toBe("xyz");
    });

    it("getAttributeAsString always returns a string", () => {
      const subject = new SwrveResource({ num: 3 } as any);
      expect(subject.getAttributeAsString("num", "")).toBe("3");
      expect(subject.getAttributeAsString("num", "")).not.toBe(3);
    });
  });

  describe("getAttributeAsNumber", () => {
    it("getAttributeAsNumber", () => {
      const subject = new SwrveResource({ num: "3" });
      expect(subject.getAttributeAsNumber("num", 5)).toEqual(3);
    });

    it("returns default value for getAttributeAsNumber with missing keys", () => {
      const subject = new SwrveResource({});
      expect(subject.getAttributeAsNumber("missing-key", 5)).toEqual(5);
    });

    it("getAttributeAsNumber always returns a number", () => {
      const subject = new SwrveResource({ num: "3" });
      expect(subject.getAttributeAsNumber("num", 5)).toEqual(3);
      expect(subject.getAttributeAsNumber("num", 5)).not.toEqual("3");
    });

    it("getAttributeAsNumber returns default value for invalid number", () => {
      const subject = new SwrveResource({ num: "abc" });
      expect(subject.getAttributeAsNumber("num", 5)).toEqual(5);
    });
  });

  describe("getAttributeAsBoolean", () => {
    it("getAttributeAsBoolean yes or true case insensitive", () => {
      const subject = new SwrveResource({
        yes1: "yes",
        yes2: "YES",
        yes3: "Yes",
        true1: "true",
        true2: "TRUE",
        true3: "True",
        bool: true as any,
      });
      expect(subject.getAttributeAsBoolean("yes1", false)).toBe(true);
      expect(subject.getAttributeAsBoolean("yes2", false)).toBe(true);
      expect(subject.getAttributeAsBoolean("yes3", false)).toBe(true);
      expect(subject.getAttributeAsBoolean("true1", false)).toBe(true);
      expect(subject.getAttributeAsBoolean("true2", false)).toBe(true);
      expect(subject.getAttributeAsBoolean("true3", false)).toBe(true);
      expect(subject.getAttributeAsBoolean("bool", false)).toBe(true);
    });

    it("getAttributeAsBoolean anything other than true or yes is false", () => {
      const subject = new SwrveResource({
        false1: "x",
        false2: "",
      });
      expect(subject.getAttributeAsBoolean("false1", true)).toBe(false);
      expect(subject.getAttributeAsBoolean("false2", true)).toBe(false);
    });

    it("returns default value for getAttributeAsNumber with missing keys", () => {
      const subject = new SwrveResource({});
      expect(subject.getAttributeAsBoolean("missing-key", true)).toBe(true);
      expect(subject.getAttributeAsBoolean("missing-key", false)).toBe(false);
    });
  });
});
