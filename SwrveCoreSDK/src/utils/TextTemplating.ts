import { IDictionary } from "..";
import SwrveLogger from "./SwrveLogger";

export class TextTemplating {
  private static patternMatch =
    /\$\{([^\}]*)\}/i; /* match any content beginning with ${ and ending in } */
  private static patternFallbackMatch = /\|fallback=\"([^\}]*)"\}/i;
  private static patternJSONFallbackMatch = /\|fallback=\\"([^\}]*)\\"\}/i;

  public static applyTextTemplatingToString(
    text: string,
    properties?: IDictionary<string>
  ): string | null {
    let templatedText: string = text;

    if (!templatedText || templatedText.length == 0) {
      return templatedText;
    }

    while (this.hasPatternMatch(templatedText)) {
      let match = templatedText.match(this.patternMatch);
      if (match == null) {
        throw new Error("Could not resolve personalization");
      }
      let templateFullValue = match[0];
      let fallback = this.getFallBack(templateFullValue);
      let property = match[1];

      if (fallback != null) {
        property = property.substring(
          0,
          property.indexOf('|fallback="')
        ); /* remove fallback text */
      }

      if (
        properties != null &&
        !(properties[property] == undefined) &&
        properties[property].length > 0
      ) {
        templatedText = templatedText.replace(
          templateFullValue,
          properties[property]
        );
      } else if (fallback != null) {
        templatedText = templatedText.replace(templateFullValue, fallback);
      } else {
        throw new Error(
          "TextTemplating: Missing property value for key " + property
        );
      }
    }
    return templatedText;
  }

  public static applyTextTemplatingToJSON(
    json: string,
    properties?: IDictionary<string>
  ): string | null {
    let templatedText: string = json;

    if (!templatedText || templatedText.length == 0) {
      return templatedText;
    }

    while (this.hasPatternMatch(templatedText)) {
      let match = templatedText.match(this.patternMatch);
      if (match == null) {
        throw new Error("Could not resolve personalization");
      }
      let templateFullValue = match[0];
      let fallback = this.getFallBackJSON(templateFullValue);
      let property = match[1];

      if (fallback != null) {
        property = property.substring(
          0,
          property.indexOf('|fallback=\\"')
        ); /* remove fallback text */
      }

      if (
        properties != null &&
        !(properties[property] == undefined) &&
        properties[property].length > 0
      ) {
        templatedText = templatedText.replace(
          templateFullValue,
          properties[property]
        );
      } else if (fallback != null) {
        templatedText = templatedText.replace(templateFullValue, fallback);
      } else {
        throw new Error(
          "TextTemplating: Missing property value for key " + property
        );
      }
    }
    return templatedText;
  }

  /* Checks if the pattern exists within a given piece of text */
  public static hasPatternMatch(text: string): boolean {
    if (text == null) {
      return false;
    }

    return this.patternMatch.test(text);
  }

  /* Example of expected template syntax: ${item.property|fallback="fallback text"} */
  private static getFallBack(templateFullValue: string): string | null {
    let fallback = null;
    let match = templateFullValue.match(TextTemplating.patternFallbackMatch);

    if (match != null) {
      return match[1];
    }

    return fallback;
  }

  /* Example of expected template syntax:
     {\"key\":"${item.property|fallback=\"fallback text\"}"} */
  private static getFallBackJSON(templateFullValue: string): string | null {
    let fallback = null;
    let match = templateFullValue.match(
      TextTemplating.patternJSONFallbackMatch
    );

    if (match != null) {
      SwrveLogger.debug("getFallbackJSON Got a Match: " + match[1]);
      return match[1];
    }

    return fallback;
  }
}
