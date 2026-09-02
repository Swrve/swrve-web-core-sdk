import { toCSSDeclarations } from "../src/utils/CSSStyleHelper";

describe("toCSSDeclarations", () => {
  it("returns an empty string when no style is configured", () => {
    expect(toCSSDeclarations(undefined)).toBe("");
  });

  it("converts camelCase object keys to CSS property names", () => {
    expect(toCSSDeclarations({ boxShadow: "0 0 0 3px red" })).toBe(
      "box-shadow: 0 0 0 3px red;"
    );
  });

  it("accepts kebab-case object keys unchanged", () => {
    expect(toCSSDeclarations({ "border-color": "red" })).toBe(
      "border-color: red;"
    );
  });

  it("accepts a raw CSS declaration string", () => {
    expect(toCSSDeclarations("outline: 3px solid yellow")).toBe(
      "outline: 3px solid yellow;"
    );
  });

  it("accepts several declarations in one string", () => {
    expect(
      toCSSDeclarations("outline: 3px solid yellow; opacity: 1")
    ).toBe("outline: 3px solid yellow;\nopacity: 1;");
  });

  it("strips properties that would reposition the button", () => {
    expect(
      toCSSDeclarations({ position: "fixed", top: "0", opacity: "1" })
    ).toBe("opacity: 1;");
  });

  it("strips resource metadata keys", () => {
    expect(toCSSDeclarations({ uid: "123", name: "focus", opacity: "1" })).toBe(
      "opacity: 1;"
    );
  });

  it("rejects a value that would close the rule and inject more CSS", () => {
    expect(
      toCSSDeclarations({ opacity: "1 } body { display: none " })
    ).toBe("");
  });

  it("rejects a property name that would close the rule", () => {
    expect(toCSSDeclarations({ "} body { color": "red" })).toBe("");
  });

  it("rejects at-rules and comment sequences", () => {
    expect(toCSSDeclarations("@import url(evil.css)")).toBe("");
    expect(toCSSDeclarations({ opacity: "1 /* x */" })).toBe("");
  });

  it("ignores declarations with no value", () => {
    expect(toCSSDeclarations("opacity:; outline: 1px solid red")).toBe(
      "outline: 1px solid red;"
    );
  });
});
