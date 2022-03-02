import { IDictionary } from "../dist/types";
import { TextTemplating } from "../src/utils/TextTemplating";

describe("TextTemplating Tests", () => {
  describe("applyTextTemplatingToString", () => {
    it("must find and replace all occurrences", () => {
      let properties = {} as IDictionary<string>;
      properties["campaignId"] = "1";
      properties["item.label"] = "some_label";
      properties["key1"] = "value1";
      properties["key2"] = "value2";

      let text = "Welcome to ${item.label}. And another ${key1}/${key2}";
      var templated = TextTemplating.applyTextTemplatingToString(
        text,
        properties
      );
      expect(templated).toBe(
        "Welcome to some_label. And another value1/value2"
      );

      text =
        "http://someurl.com/${item.label}/key1=${key1}&blah=${key2}&key1=${key1}";
      templated = TextTemplating.applyTextTemplatingToString(text, properties);
      expect(templated).toBe(
        "http://someurl.com/some_label/key1=value1&blah=value2&key1=value1"
      );

      expect(() => {
        text =
          "THIS SHOULD throw SwrveSDKTextTemplatingException: Welcome to ${item.label}. And another ${key3}/${key4}"; // these values aren't in the customFields
        templated = TextTemplating.applyTextTemplatingToString(
          text,
          properties
        );
      }).toThrowError("TextTemplating: Missing property value for key key3");
    });

    it("must apply fallbacks for missing properties", () => {
      let properties = {} as IDictionary<string>;
      properties["campaignId"] = "1";
      properties["item.label"] = "some_label";
      properties["key1"] = "value1";
      properties["key2"] = "value2";

      let text =
        'Welcome to ${item.label}. And another ${key1}/${key2} ${item.label|fallback="fallback property"}';
      let templated = TextTemplating.applyTextTemplatingToString(
        text,
        properties
      );
      expect(templated).toBe(
        "Welcome to some_label. And another value1/value2 some_label"
      );

      properties = {} as IDictionary<string>;
      properties["campaignId"] = "1";
      properties["item.label"] = "";
      properties["key1"] = "value1";
      properties["key2"] = "value2";
      text =
        'Welcome to ${item.label|fallback="hello"}. And another ${key1}/${key2}/${key3|fallback="ola"} ${item.label|fallback="bye"}';
      templated = TextTemplating.applyTextTemplatingToString(text, properties);
      expect(templated).toBe(
        "Welcome to hello. And another value1/value2/ola bye"
      );

      properties = {} as IDictionary<string>;
      properties["campaignId"] = "1";
      properties["item.label"] = "";
      text =
        'http://www.deeplink.com/param1=${param1|fallback="1"}&param2=${param2|fallback="2"}';
      templated = TextTemplating.applyTextTemplatingToString(text, properties);
      expect(templated).toBe("http://www.deeplink.com/param1=1&param2=2");
    });

    it("must work with just fallbacks and no properties at all", () => {
      const text = 'Welcome to ${item.label|fallback="fallback property"}';

      var templated = TextTemplating.applyTextTemplatingToString(text, {});
      expect(templated).toBe("Welcome to fallback property");

      templated = TextTemplating.applyTextTemplatingToString(text);
      expect(templated).toBe("Welcome to fallback property");
    });
  });

  describe("applyTextTemplatingToJSON", () => {
    it("must find and replace all occurrences", () => {
      let properties = {} as IDictionary<string>;
      properties["campaignId"] = "1";
      properties["item.label"] = "swrve";
      properties["key1"] = "value1";
      properties["key2"] = "value2";

      var text =
        '{"${item.label}": "${key1}/${key2}", "keys": "${key1}/${key2}"}';
      var templated = TextTemplating.applyTextTemplatingToJSON(
        text,
        properties
      );
      expect(templated).toBe(
        '{"swrve": "value1/value2", "keys": "value1/value2"}'
      );

      expect(() => {
        text =
          '{"${item.label}": "${key1}/${key2}", "keys": "${key3}/${key4}"}'; // these values aren't in the customFields
        templated = TextTemplating.applyTextTemplatingToJSON(text, properties);
      }).toThrowError("TextTemplating: Missing property value for key key3");
    });

    it("must apply fallbacks for missing properties", () => {
      // first check firstname will work with fallback in the key 
      let properties = {"user.firstname": "testman"} as IDictionary<string>;
      let text = '{"key":"${user.firstname|fallback=\\"working\\"}"}';
      let templated = TextTemplating.applyTextTemplatingToJSON(
        text,
        properties
      );
      expect(templated).toBe('{"key":"testman"}');
      
      // now we make sure it's replacing from fallback
      properties = {} as IDictionary<string>;
      text = '{"key":"${user.firstname|fallback=\\"working\\"}"}';
      templated = TextTemplating.applyTextTemplatingToJSON(
        text,
        properties
      );
      expect(templated).toBe('{"key":"working"}');

      properties = {} as IDictionary<string>;
      text =
        '{"${user.firstname|fallback=\\"key\\"}":"${user.firstname|fallback=\\"working\\"}"}';
      templated = TextTemplating.applyTextTemplatingToJSON(text, properties);
      expect(templated).toBe('{"key":"working"}');
    });
  });

  describe("hasPatternMatch", () => {
    it("must find only strings with the correct regex pattern", () => {
      const hasPattern =
        "Welcome to ${item.label}. And another ${key1}/${key2}";
      expect(TextTemplating.hasPatternMatch(hasPattern)).toBeTruthy();

      const hasNotPattern = "Welcome to $$$$$$$$P{";
      expect(TextTemplating.hasPatternMatch(hasNotPattern)).toBeFalsy();

      const plainText = "plain ol text";
      expect(TextTemplating.hasPatternMatch(plainText)).toBeFalsy();
    });
  });
});
