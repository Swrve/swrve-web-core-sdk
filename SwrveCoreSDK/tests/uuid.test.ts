import * as uuid from "../src/utils/uuid";

describe("uuid", () => {
  describe(".generateUuid()", () => {
    it("should return version 4 UUID", () => {
      const id = uuid.generateUuid();
      expect(id.toString()).toMatch(
        /^........-....-4...-[89ab]...-............$/
      );
    });
    it("should return different UUIDs each time", () => {
      const a = uuid.generateUuid();
      const b = uuid.generateUuid();
      expect(a.toString()).not.toBe(b.toString());
    });
  });

  describe(".parseUuid()", () => {
    it("should parse valid UUID", () => {
      const text = "c848dc42-a1af-4a5b-8eb2-6843003db416";
      const id = uuid.parseUuid(text);
      expect(id.toString()).toBe(text);
    });
    it("should parse valid UUID with spaces", () => {
      const text = "3a6bab9e-cb8f-4b9a-96ef-c6f0ea7c082c";
      const id = uuid.parseUuid("   " + text + " ");
      expect(id.toString()).toBe(text);
    });

    it("should throw on invalid UUID", () => {
      expect(() => {
        uuid.parseUuid("a308a44c-eb30-4d18-bec6-z743775dc9b0");
      }).toThrowError("Invalid UUID");
    });
  });
});
