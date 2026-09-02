import { parseJsonPreservingLargeIds } from "../src/RestClient/JsonParser";

describe("parseJsonPreservingLargeIds", () => {
  it("preserves unsafe message and variant ids as strings", () => {
    const parsed = parseJsonPreservingLargeIds(
      '{"push_inbox":[{"message_id":3736125122677632001,"variant_id":3736125122677632002}]}'
    );

    expect(parsed.push_inbox[0].message_id).toBe("3736125122677632001");
    expect(parsed.push_inbox[0].variant_id).toBe("3736125122677632002");
  });

  it("leaves safe ids and unrelated large integers unchanged", () => {
    const parsed = parseJsonPreservingLargeIds(
      '{"message_id":123,"campaign_id":3736125122677632001}'
    );

    expect(parsed.message_id).toBe(123);
    expect(parsed.campaign_id).toBe(3736125122677632000);
  });

  it("does not alter matching text inside JSON strings", () => {
    const text = '{"customer_json":{"body":"\\"message_id\\":3736125122677632001"}}';

    expect(parseJsonPreservingLargeIds(text)).toEqual({
      customer_json: { body: '"message_id":3736125122677632001' },
    });
  });
});
