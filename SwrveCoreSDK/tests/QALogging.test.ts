import { QALogging } from "../src/Events/QALogging";
import { ISwrveConfig } from "../src/interfaces/ISwrveConfig";
import SwrveConfig from "../src/Config/SwrveConfig";
import { StorageManager } from "../src/Storage/StorageManager";
import { ProfileManager } from "../src/Profile/ProfileManager";
import { EventFactory } from "../src/Events/EventFactory";
import MockSwrveRestClient from "./mocks/MockSwrveRestClient";
import PlatformMock from "./mocks/PlatformMock";
import IReward from "../src/interfaces/IReward";
import {
  ICampaignsDownloadedEvent,
  ICampaignTriggeredEvent,
  IQAButtonClickedEvent,
  IQACurrencyGivenEvent,
  IQADeviceUpdateEvent,
  IQAIAPEvent,
  IQANamedEvent,
  IQAPurchaseEvent,
  IQASessionStartEvent,
  IQAUserUpdateEvent,
} from "../src/interfaces/IQAEvents";
import { ICampaignDownloadData } from "../src/Events/EventTypeInterfaces";

const userId = "SwrveDevice";
const configInterface = {
  appId: 30512,
  apiKey: "1234",
  stack: "us",
  httpsTimeoutSeconds: 1,
  language: "en",
} as ISwrveConfig;

const config = new SwrveConfig(configInterface);
const restClient = new MockSwrveRestClient();
const pal = new PlatformMock();
const factory = new EventFactory();
const storageManager = new StorageManager(pal);
const profileManager = new ProfileManager(userId, 1111, "key", 1000, storageManager);

describe("QALogging: Create Events", () => {
  let subject: QALogging;

  beforeEach(() => {
    Date.now = jest.fn(() => new Date("2019-04-07T10:20:30Z").getTime());
    subject = new QALogging(restClient, config, profileManager, pal.deviceID);
    profileManager.setAsQAUser({
      reset_device_state: true,
      logging: true,
    });
  });

  it("Create QA Log of a named event", () => {
    const namedEvent: any = factory.getNamedEvent(
      "eventName",
      {},
      1,
      Date.now()
    );

    subject.namedEvent(namedEvent);
    const queue = subject.getQueue();
    expect(queue.length).toEqual(1);
    const result = queue[0] as IQANamedEvent;

    expect(result).toBeTruthy();
    expect(result.time).toBe(Date.now());
    expect(result.log_details.type).toBe("event");
    expect(result.log_details.seqnum).toBe(1);
    expect(result.log_details.parameters.name).toBe("eventName");
    expect(result.log_details.parameters.payload).toEqual({});
  });

  it("Create QA Log of a userUpdate", () => {
    const userUpdate: any = factory.getUserUpdate(
      { key: "value" },
      1,
      Date.now()
    );

    subject.userUpdate(userUpdate);
    const queue = subject.getQueue();
    expect(queue.length).toEqual(1);
    const result = queue[0] as IQAUserUpdateEvent;

    expect(result).toBeTruthy();
    expect(result.time).toBe(Date.now());
    expect(result.log_details.type).toBe("user");
    expect(result.log_details.seqnum).toBe(1);
    expect(result.log_details.parameters.attributes).toEqual({ key: "value" });
  });

  it("Create QA Log of a userUpdateWithDate", () => {
    const userUpdateWithDate: any = factory.getUserUpdateWithDate(
      "key",
      new Date("2019-05-07T10:20:30Z"),
      1,
      Date.now()
    );

    subject.userUpdateWithDate(userUpdateWithDate);
    const queue = subject.getQueue();
    expect(queue.length).toEqual(1);
    const result = queue[0] as IQAUserUpdateEvent;

    expect(result).toBeTruthy();
    expect(result.time).toBe(Date.now());
    expect(result.log_details.type).toBe("user");
    expect(result.log_details.seqnum).toBe(1);
    expect(result.log_details.parameters.attributes).toEqual({
      key: "2019-05-07T10:20:30Z",
    });
  });

  it("Create QA Log of a deviceUpdate", () => {
    const deviceUpdateEvent: any = factory.getDeviceUpdate(
      { a: "1", b: "2" },
      1,
      Date.now()
    );

    subject.deviceUpdate(deviceUpdateEvent);
    const queue = subject.getQueue();
    expect(queue.length).toEqual(1);
    const result = queue[0] as IQADeviceUpdateEvent;

    expect(result).toBeTruthy();
    expect(result.time).toBe(Date.now());
    expect(result.log_details.type).toBe("device_update");
    expect(result.log_details.seqnum).toBe(1);
    expect(result.log_details.parameters.attributes).toEqual({
      a: "1",
      b: "2",
    });
  });

  it("Create QA Log of a purchaseEvent", () => {
    const purchaseEvent: any = factory.getPurchaseEvent(
      "keyName",
      "EUR",
      111,
      2,
      1,
      Date.now()
    );

    subject.purchaseEvent(purchaseEvent);
    const queue = subject.getQueue();
    expect(queue.length).toEqual(1);
    const result = queue[0] as IQAPurchaseEvent;

    expect(result).toBeTruthy();
    expect(result.time).toBe(Date.now());
    expect(result.log_details.type).toBe("purchase");
    expect(result.log_details.seqnum).toBe(1);
    expect(result.log_details.parameters.item).toBe("keyName");
    expect(result.log_details.parameters.cost).toBe(111);
    expect(result.log_details.parameters.currency).toBe("EUR");
    expect(result.log_details.parameters.quantity).toBe(2);
  });

  it("Create QA Log of a purchaseEvent", () => {
    const purchaseEvent: any = factory.getPurchaseEvent(
      "keyName",
      "EUR",
      111,
      2,
      1,
      Date.now()
    );

    subject.purchaseEvent(purchaseEvent);
    const queue = subject.getQueue();
    expect(queue.length).toEqual(1);
    const result = queue[0] as IQAPurchaseEvent;

    expect(result).toBeTruthy();
    expect(result.time).toBe(Date.now());
    expect(result.log_details.type).toBe("purchase");
    expect(result.log_details.seqnum).toBe(1);
    expect(result.log_details.parameters.item).toBe("keyName");
    expect(result.log_details.parameters.cost).toBe(111);
    expect(result.log_details.parameters.currency).toBe("EUR");
    expect(result.log_details.parameters.quantity).toBe(2);
  });

  it("Create QA Log of a inAppPurchaseEventWithoutReceipt", () => {
    const reward = { type: "item", amount: 2 } as IReward;
    const inAppPurchaseEvent: any = factory.getInAppPurchaseEventWithoutReceipt(
      1,
      "productID",
      12,
      "EUR",
      1,
      Date.now(),
      { testReward: reward }
    );

    subject.inAppPurchaseEventWithoutReceipt(inAppPurchaseEvent);
    const queue = subject.getQueue();
    expect(queue.length).toEqual(1);
    const result = queue[0] as IQAIAPEvent;

    expect(result).toBeTruthy();
    expect(result.time).toBe(Date.now());
    expect(result.log_details.type).toBe("iap");
    expect(result.log_details.seqnum).toBe(1);
    expect(result.log_details.parameters.app_store).toBe("unknown_store");
    expect(result.log_details.parameters.cost).toBe(12);
    expect(result.log_details.parameters.local_currency).toBe("EUR");
    expect(result.log_details.parameters.rewards).toEqual({
      testReward: reward,
    });
  });

  it("Create QA Log of a sessionStart", () => {
    const sessionStartEvent: any = factory.getStartSessionEvent(1, Date.now());
    subject.sessionStart(sessionStartEvent);

    const queue = subject.getQueue();
    expect(queue.length).toEqual(1);
    const result = queue[0] as IQASessionStartEvent;

    expect(result).toBeTruthy();
    expect(result.time).toBe(Date.now());
    expect(result.log_details.type).toBe("session_start");
    expect(result.log_details.seqnum).toBe(1);
  });

  it("Create QA Log of a currencyGivenEvent", () => {
    const currencyGivenEvent: any = factory.getCurrencyGivenEvent(
      "gold",
      12,
      1,
      Date.now()
    );

    subject.currencyGivenEvent(currencyGivenEvent);
    const queue = subject.getQueue();
    expect(queue.length).toEqual(1);
    const result = queue[0] as IQACurrencyGivenEvent;

    expect(result).toBeTruthy();
    expect(result.time).toBe(Date.now());
    expect(result.log_details.type).toBe("currency_given");
    expect(result.log_details.seqnum).toBe(1);
    expect(result.log_details.parameters.given_amount).toBe(12);
    expect(result.log_details.parameters.given_currency).toBe("gold");
  });

  it("Create QA Log of a campaignTriggeredEvent", () => {
    const campaignTriggeredEvent: any = factory.getCampaignTriggeredEvent(
      "eventName",
      { key: "value" },
      "test reason",
      "displayed",
      []
    );

    subject.campaignTriggeredEvent(1, campaignTriggeredEvent);
    const queue = subject.getQueue();
    expect(queue.length).toEqual(1);
    const result = queue[0] as ICampaignTriggeredEvent;

    expect(result).toBeTruthy();
    expect(result.log_type).toBe("campaign-triggered");
    expect(result.seqnum).toBe(1);
    expect(result.time).toBe(Date.now());
    expect(result.log_source).toBe("sdk");
    expect(result.log_details.event_name).toBe("eventName");
    expect(result.log_details.event_payload).toEqual({ key: "value" });
  });

  it("Create QA Log of a campaignsDownloadedEvent", () => {
    const campaignsDownloaded: ICampaignDownloadData[] = [
      { id: 1, variant_id: 2, type: "message" },
      { id: 1, variant_id: 2, type: "embedded_message" },
    ];
    subject.campaignsDownloadedEvent(1, campaignsDownloaded);
    const queue = subject.getQueue();
    expect(queue.length).toEqual(1);
    const result = queue[0] as ICampaignsDownloadedEvent;

    expect(result).toBeTruthy();
    expect(result.time).toBe(Date.now());
    expect(result.log_details.campaigns).toEqual(campaignsDownloaded);
    expect(result.seqnum).toBe(1);
  });

  it("Create QA Log of a buttonClickEvent", () => {
    subject.buttonClickEvent(222, 2, "button1", "CUSTOM", "actionValue", 1);
    const queue = subject.getQueue();
    expect(queue.length).toEqual(1);
    const result = queue[0] as IQAButtonClickedEvent;

    expect(result).toBeTruthy();
    expect(result.time).toBe(Date.now());
    expect(result.seqnum).toBe(1);
    expect(result.log_details.campaign_id).toBe(222);
    expect(result.log_details.variant_id).toBe(2);
    expect(result.log_details.button_name).toBe("button1");
    expect(result.log_details.action_type).toBe("deeplink");
    expect(result.log_details.action_value).toBe("actionValue");
  });

  it("Will not queue a QALog if user is not a QAUser", () => {
    jest.spyOn(subject, "shouldBeLogging").mockReturnValue(false);
    const namedEvent: any = factory.getNamedEvent(
      "eventName",
      {},
      1,
      Date.now()
    );

    subject.namedEvent(namedEvent);
    const queue = subject.getQueue();
    expect(queue.length).not.toBeGreaterThan(0);
  });

  it("Queue will flush appropriately only when LogTimer is enabled", (done) => {
    subject.qaLogFlushFrequencyMilliseconds = 100; // make it extremely short to test it
    const namedEvent: any = factory.getNamedEvent(
      "eventName",
      {},
      1,
      Date.now()
    );

    subject.namedEvent(namedEvent);
    let queue = subject.getQueue();
    expect(queue.length).toBe(1);

    subject.startQALogTimer();

    setTimeout(() => {
      queue = subject.getQueue();
      expect(queue.length).not.toBeGreaterThan(0);
      subject.stopQALogTimer();

      // Add 2 more events with timer off
      subject.namedEvent(namedEvent);
      subject.namedEvent(namedEvent);

      queue = subject.getQueue();
      expect(queue.length).toBe(2);

      done();
    }, 100);
  });
  
});
