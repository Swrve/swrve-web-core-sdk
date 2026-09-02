import { SwrveRestClient } from "../src/RestClient/SwrveRestClient";

describe("SwrveRestClient", () => {
  it("preserves unsafe numeric push inbox ids from the response text", async () => {
    const originalFetch = globalThis.fetch;
    const originalRequest = globalThis.Request;
    const response = {
      ok: true,
      headers: new Headers(),
      text: async () =>
        '{"push_inbox":[{"message_id":3736125122677632001,"variant_id":3736125122677632002}]}',
    } as Response;
    (globalThis as any).fetch = jest.fn().mockResolvedValue(response);
    (globalThis as any).Request = function(path: string, init: RequestInit) {
      return { path, init };
    };

    try {
      const result = await new SwrveRestClient().get<any>("https://example.com");

      expect(result.data.push_inbox[0].message_id).toBe("3736125122677632001");
      expect(result.data.push_inbox[0].variant_id).toBe("3736125122677632002");
    } finally {
      (globalThis as any).fetch = originalFetch;
      (globalThis as any).Request = originalRequest;
    }
  });
});
