import {
  ISwrveConfig,
  ISwrveInAppMessageConfig,
} from "../src/interfaces/ISwrveConfig";
import SwrveConfig from "../src/Config/SwrveConfig";

describe("SWRVE CONFIG TESTS", () => {
  describe("SwrveConfig", () => {
    it("constructor makes a config with defaults", () => {
      const config = new SwrveConfig({ appId: 30512, apiKey: "1234" });
      expect(config.AppID).toBe(30512);
      expect(config.ApiKey).toBe("1234");
      expect(config.HttpsTimeoutSeconds).toBe(10);
      expect(config.Language).toBe("English");
      expect(config.ContentUrl).toBe("https://30512.content.swrve.com");
      expect(config.EventsUrl).toBe("https://30512.api.swrve.com");
      expect(config.IdentityUrl).toBe(
        "https://30512.identity.swrve.com/identify"
      );
      expect(config.AppStore).toBe("web");
      expect(config.AppVersion).toBe("1.0");
      expect(config.InAppMessageConfig).toEqual({
        autoShowMessagesMaxDelay: 5000,
      });
    });

    it("accepts non-default values", () => {
      const inAppConfig = {
        autoShowMessagesMaxDelay: 1000,
        defaultBackgroundColor: "#FFFFFF",
        defaultButtonStyle: {
          border: "none",
        },
        defaultButtonFocusStyle: {
          border: "5px solid red",
        },
      } as ISwrveInAppMessageConfig;

      const modifiedConfig = {
        appId: 30511,
        apiKey: "1235",
        stack: "eu",
        httpsTimeoutSeconds: 30,
        language: "French",
        contentUrl: "https://content.example.org/",
        eventsUrl: "https://api.example.org/",
        inAppMessageConfig: inAppConfig,
      } as ISwrveConfig;

      const config = new SwrveConfig(modifiedConfig);
      expect(config.AppID).toBe(30511);
      expect(config.ApiKey).toBe("1235");
      expect(config.Stack).toBe("eu");
      expect(config.HttpsTimeoutSeconds).toBe(30);
      expect(config.Language).toBe("French");
      expect(config.ContentUrl).toBe("https://content.example.org/");
      expect(config.EventsUrl).toBe("https://api.example.org/");
      expect(config.InAppMessageConfig.autoShowMessagesMaxDelay).toBe(1000);
      expect(config.InAppMessageConfig.defaultBackgroundColor).toBe("#FFFFFF");
      expect(config.InAppMessageConfig.defaultButtonStyle).toEqual({
        border: "none",
      });
      expect(config.InAppMessageConfig.defaultButtonFocusStyle).toEqual({
        border: "5px solid red",
      });
    });

    it("updates urls appropriately to stack", () => {
      const modifiedConfig = {
        appId: 30511,
        apiKey: "1235",
        stack: "eu",
      } as ISwrveConfig;

      const config = new SwrveConfig(modifiedConfig);
      expect(config.AppID).toBe(30511);
      expect(config.ApiKey).toBe("1235");
      expect(config.Stack).toBe("eu");
      expect(config.ContentUrl).toBe("https://30511.eu-content.swrve.com");
      expect(config.EventsUrl).toBe("https://30511.eu-api.swrve.com");
      expect(config.IdentityUrl).toBe(
        "https://30511.eu-identity.swrve.com/identify"
      );
    });
  });
});
