import IDictionary from "../interfaces/IDictionary";
import { ICSSStyle } from "../interfaces/ISwrveConfig";

/**
 * CSS properties that configuration is not allowed to set. The positioning
 * properties would move an element out of the authored campaign layout. The
 * remaining keys are metadata carried by resource-shaped style objects.
 */
const BLOCKED_CSS_PROPERTIES: IDictionary<boolean> = [
  "position",
  "width",
  "height",
  "top",
  "left",
  "uid",
  "name",
  "description",
  "thumbnail",
  "item_class",
].reduce((blocked, property) => {
  blocked[property] = true;

  return blocked;
}, {} as IDictionary<boolean>);

/**
 * Characters that would let a configured property or value escape its own
 * declaration and inject arbitrary rules into the stylesheet.
 */
const UNSAFE_CSS = /[{}<>;@]|\/\*|\*\//;

function toCSSPropertyName(key: string): string {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .trim()
    .toLowerCase();
}

function isSafeDeclaration(property: string, value: string): boolean {
  if (!property || !value) {
    return false;
  }

  if (UNSAFE_CSS.test(property) || UNSAFE_CSS.test(value)) {
    return false;
  }

  return !BLOCKED_CSS_PROPERTIES[property];
}

function fromStyleObject(style: ICSSStyle): ICSSStyle {
  const parsed: ICSSStyle = {};

  Object.keys(style).forEach((key) => {
    parsed[toCSSPropertyName(key)] = String(style[key]).trim();
  });

  return parsed;
}

function fromStyleString(style: string): ICSSStyle {
  const parsed: ICSSStyle = {};

  style.split(";").forEach((declaration) => {
    const separatorIndex = declaration.indexOf(":");
    if (separatorIndex < 0) {
      return;
    }

    const property = toCSSPropertyName(declaration.substring(0, separatorIndex));
    parsed[property] = declaration.substring(separatorIndex + 1).trim();
  });

  return parsed;
}

/**
 * Turns a configured style, given either as an object of CSS properties or as a
 * string of CSS declarations, into declarations that can be embedded in a rule.
 * Unsafe and blocked properties are dropped rather than escaped.
 */
export function toCSSDeclarations(style?: ICSSStyle | string): string {
  if (!style) {
    return "";
  }

  const parsed =
    typeof style === "string" ? fromStyleString(style) : fromStyleObject(style);

  return Object.keys(parsed)
    .filter((property) => isSafeDeclaration(property, parsed[property]))
    .map((property) => `${property}: ${parsed[property]};`)
    .join("\n");
}
