import { EventFactory } from "../src/Events/EventFactory";
import { ISwrveBaseMessage } from "../src/interfaces/ISwrveCampaign";

describe("EventFactory: Create Events", () => {
  let subject: EventFactory;

  beforeEach(() => {
    subject = new EventFactory();
  });

  it("Create named event", () => {
    const event: any = subject.getNamedEvent(
      "test",
      { type: "test", amount: 4 },
      1,
      Date.now()
    );

    expect(event.type).toBe("event");
    expect(event.name).toBe("test");
    expect(event.payload.type).toBe("test");
    expect(event.payload.amount).toBe(4);
  });

  it("Create named event with empty payload", () => {
    const event: any = subject.getNamedEvent("test", {}, 1, Date.now());

    expect(event.type).toBe("event");
    expect(event.name).toBe("test");
    expect(event.payload).toEqual({});
  });

  it("Create UserUpdateWithDate", () => {
    const event: any = subject.getUserUpdateWithDate(
      "keyName",
      new Date("05 October 2011 14:48 UTC"),
      1,
      Date.now()
    );

    expect(event.type).toBe("user");
    expect(event.attributes).toEqual({ keyName: "2011-10-05T14:48:00Z" });
  });

  it("Create ButtonClickEvent", () => {
    const testBaseMessage = {
      id: 1234,
      name: "test base message",
      priority: 1,
      rules: { orientations: "landscape" },
      parentCampaign: 1,
    } as ISwrveBaseMessage;

    const event: any = subject.getButtonClickEvent(1, testBaseMessage, "button1", "false");

    expect(event.type).toBe("event");
    expect(event.name).toBe("Swrve.Messages.Message-1234.click");
    expect(event.seqnum).toBe(1);
    expect(event.payload.name).toBe("button1");
    expect(event.payload.embedded).toBe("false");
    // No context supplied -> payload stays minimal (parity with embedded clicks)
    expect(event.payload.buttonId).toBeUndefined();
    expect(event.payload.contextId).toBeUndefined();
    expect(event.payload.pageName).toBeUndefined();
  });

  it("Create ButtonClickEvent with page/button context (iOS/Android parity)", () => {
    const testBaseMessage = { id: 1234 } as ISwrveBaseMessage;

    const event: any = subject.getButtonClickEvent(
      1,
      testBaseMessage,
      "button1",
      "false",
      { buttonId: 7, contextId: 42, pageName: "home" }
    );

    expect(event.payload.name).toBe("button1");
    expect(event.payload.embedded).toBe("false");
    expect(event.payload.buttonId).toBe(7);
    expect(event.payload.contextId).toBe(42);
    expect(event.payload.pageName).toBe("home");
  });

  it("ButtonClickEvent omits context fields that are undefined", () => {
    const testBaseMessage = { id: 1234 } as ISwrveBaseMessage;

    const event: any = subject.getButtonClickEvent(
      1,
      testBaseMessage,
      "button1",
      "false",
      { buttonId: 3 }
    );

    expect(event.payload.buttonId).toBe(3);
    expect(event.payload).not.toHaveProperty("contextId");
    expect(event.payload).not.toHaveProperty("pageName");
  });

  it("Generic campaign event accepts an explicit time", () => {
    const event: any = subject.getGenericCampaignEvent(
      2,
      "push",
      "delivered",
      "1",
      undefined,
      { displayed: "true" },
      undefined,
      1701873418769
    );

    expect(event.type).toBe("generic_campaign_event");
    expect(event.campaignType).toBe("push");
    expect(event.actionType).toBe("delivered");
    expect(event.id).toBe("1");
    expect(event.time).toBe(1701873418769);
  });

  it("Create generic campaign event", () => {
    const event: any = subject.getGenericCampaignEvent(
      2,
      "iam",
      "navigation",
      740417,
      1,
      {
        pageName: "first",
        to: 2,
        buttonId: 1,
        buttonName: "Next",
      }
    );

    expect(event.type).toBe("generic_campaign_event");
    expect(event.seqnum).toBe(2);
    expect(event.campaignType).toBe("iam");
    expect(event.actionType).toBe("navigation");
    expect(event.id).toBe(740417);
    expect(event.contextId).toBe(1);
    expect(event.payload.pageName).toBe("first");
    expect(event.payload.to).toBe(2);
    expect(event.payload.buttonId).toBe(1);
    expect(event.payload.buttonName).toBe("Next");
  });

  it("Create UserUpdateWithDate custom key name", () => {
    const event: any = subject.getUserUpdateWithDate(
      "custom_date",
      new Date("05 October 2011 14:48 UTC"),
      1,
      Date.now()
    );

    expect(event.type).toBe("user");
    expect(event.attributes).toEqual({
      custom_date: "2011-10-05T14:48:00Z",
    });
  });

  it("Create UserUpdate", () => {
    const event: any = subject.getUserUpdate(
      { test1: "test2", test2: "test2" },
      1,
      Date.now()
    );

    expect(event.type).toBe("user");
    expect(event.attributes).toEqual({ test1: "test2", test2: "test2" });
  });

  it("Create Purchase Event", () => {
    const event: any = subject.getPurchaseEvent(
      "buyGold",
      "gold",
      5,
      10,
      1,
      Date.now()
    );

    expect(event.type).toBe("purchase");
    expect(event.quantity).toBe(10);
    expect(event.item).toBe("buyGold");
    expect(event.currency).toBe("gold");
    expect(event.cost).toBe(5);
  });

  it("Create Purchase Event without Receipt", () => {
    const event: any = subject.getInAppPurchaseEventWithoutReceipt(
      10,
      "Z34",
      5,
      "gold",
      1,
      Date.now()
    );

    expect(event.type).toBe("iap");
    expect(event.quantity).toBe(10);
    expect(event.local_currency).toBe("gold");
    expect(event.cost).toBe(5);
  });

  it("Create device update event", () => {
    const time = new Date(2018, 7, 4).getTime();
    const event: any = subject.getDeviceUpdate({ a: "1", b: "2" }, 1, time);

    expect(event.type).toBe("device_update");
    expect(event.time).toBe(time);
    expect(event.seqnum).toBe(1);
    expect(event.attributes).toEqual({ a: "1", b: "2" });
  });
});
