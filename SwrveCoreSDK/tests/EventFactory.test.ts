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
