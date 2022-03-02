import { EventManager } from "../src/Events/EventManager";
import { MockSwrveRestClient } from "./mocks/MockSwrveRestClient";
import { EventFactory } from "../src/Events/EventFactory";
import { StorageManager } from "../src/Storage/StorageManager";
import PlatformMock from "./mocks/PlatformMock";
import { Swrve } from "../src/Swrve";
import INamedEvent from "../src/interfaces/INamedEvent";
import { ProfileManager } from "../src/Profile/ProfileManager";
import { ISwrveConfig } from "../src/interfaces/ISwrveConfig";
import SwrveConfig from "../src/Config/SwrveConfig";

const userId = "SwrveDevice";
const configInterface = {

    appId: 30512,
    apiKey: "1234",
    stack: "us",
    httpsTimeoutSeconds: 1,
    language: "en",
  } as ISwrveConfig

const config = new SwrveConfig(configInterface);

const restClient = new MockSwrveRestClient();
const pal = new PlatformMock();
const storageManager = new StorageManager(pal);
const profileManager = new ProfileManager(
  userId,
  1111,
  "key",
  1000,
  storageManager
);
const eventManager = new EventManager(restClient, storageManager, config, profileManager, pal.deviceID);
const factory = new EventFactory();

const sdk = new Swrve(
  { appId: 30512, apiKey: "1234" },
  { platform: pal, eventManager: eventManager, restClient }
);


/*
 * Helpers
 */
const clearEvents = (): void => {
  eventManager.clearQueue();
  localStorage.clear();
};

const getNamedEvent = (): INamedEvent => {
  const namedEvent = factory.getNamedEvent("test", { a: 1 }, 1, Date.now());
  if (namedEvent.type !== "event") throw new Error("Unexpected event type");

  return namedEvent;
};

const tearDown = (): void => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
};

const errorCallback = () => {
  throw new Error("Unknown error");
};

const expectToSeeEventsQueued = (
  eventManager: EventManager,
  events: []
): void => {
  const queuedEvents = eventManager.getAllQueuedEvents(userId) as INamedEvent[];
  expect(queuedEvents.map((event) => event.payload?.id).sort()).toEqual(events);
};

describe("EVENT MANAGER TESTS", () => {
  beforeEach(() => {
    Date.now = jest.fn(() => new Date("2019-04-07T10:20:30Z").getTime());
    clearEvents();
  });

  it("queues an event", () => {
    const evt = getNamedEvent();

    eventManager.queueEvent(evt);
    const que = eventManager.getQueue();
    const item = que[0];

    if (item.type !== "event") {
      throw new Error("Unexpected event type");
    }

    expect(item.name).toEqual("test");
  });

  it("calculate size correctly", () => {
    const evt = getNamedEvent();

    eventManager.queueEvent(evt);

    const size1 = eventManager.queueSize;
    expect(size1).toEqual(80);

    eventManager.queueEvent({
      type: "event",
      time: 1524256558616,
      seqnum: 1,
      name: "test",
      payload: { a: "Ξ" },
    });

    const size2 = eventManager.queueSize;
    const queue = eventManager.getQueue();
    expect(queue.length).toEqual(2);

    expect(size2).toEqual(80 + 83);
  });

  it("calculate size of stored events correctly", () => {
    eventManager.queueEvent({
      type: "event",
      time: 1524256558616,
      seqnum: 1,
      name: "test",
      payload: { a: "Ξ" },
    });
    expect(eventManager.queueSize).toEqual(83);

    eventManager.saveEventsToStorage("123");
    expect(eventManager.queueSize).toEqual(83);

    eventManager.queueEvent({
      type: "event",
      time: 1524256558616,
      seqnum: 2,
      name: "test",
      payload: { abc: 1234 },
    });
    expect(eventManager.queueSize).toEqual(83 + 85);
  });

  it("saves to storage", () => {
    const evt = getNamedEvent();

    eventManager.queueEvent(evt);
    eventManager.saveEventsToStorage("123");

    const reconstituted = <INamedEvent[]>eventManager.getStoredEvents("123");

    expect(reconstituted[0].type).toEqual("event");
    expect(reconstituted[0].name).toEqual(evt.name);
  });

  describe("send queued events", () => {
    describe("basic", () => {
      afterEach(() => tearDown());

      test.each`
        case                               | response                                 | events       | finalQueue
        ${"events are deleted from queue"} | ${{ status: 200 }}                       | ${[1, 2, 3]} | ${[]}
        ${"events are deleted from queue"} | ${{ status: 300 }}                       | ${[1, 2, 3]} | ${[]}
        ${"events are deleted from queue"} | ${{ status: 400 }}                       | ${[1, 2, 3]} | ${[]}
        ${"events remain in queue"}        | ${{ status: 500 }}                       | ${[1, 2, 3]} | ${[1, 2, 3]}
        ${"events remain in queue"}        | ${{ throwsNetworkError: errorCallback }} | ${[1, 2, 3]} | ${[1, 2, 3]}
      `(
        "$case on a $response.status rest response ",
        async ({ _, response, events, finalQueue }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(response);
          // queue and save events to storage
          events.forEach((id: number) => sdk.event("test", { id: id }));
          eventManager.saveEventsToStorage(userId);

          // Expect to see events in queue
          expectToSeeEventsQueued(eventManager, events);

          // Send events and expect postEvents to have been called for each batch
          await eventManager.sendQueue(userId);
          expect(restClient.post).toHaveBeenCalledTimes(1);

          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });

    describe("with flush", () => {
      afterEach(() => tearDown());

      test.each`
        case                               | response                                 | events       | finalQueue
        ${"events are deleted from queue"} | ${{ status: 200 }}                       | ${[1, 2, 3]} | ${[]}
        ${"events are deleted from queue"} | ${{ status: 300 }}                       | ${[1, 2, 3]} | ${[]}
        ${"events are deleted from queue"} | ${{ status: 400 }}                       | ${[1, 2, 3]} | ${[]}
        ${"events remain in queue"}        | ${{ status: 500 }}                       | ${[1, 2, 3]} | ${[1, 2, 3]}
        ${"events remain in queue"}        | ${{ throwsNetworkError: errorCallback }} | ${[1, 2, 3]} | ${[1, 2, 3]}
      `(
        "$case on $response.status rest response ",
        async ({ _, response, events, finalQueue }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(response);

          // queue and save events to storage
          events.forEach((id: number, index: number) => {
            sdk.event("test", { id: id });
            if (index == 1) eventManager.saveEventsToStorage(userId);
          });

          // Expect to see events in queue
          expectToSeeEventsQueued(eventManager, events);

          // Send events and expect postEvents to have been called for each batch
          await eventManager.sendQueue(userId);
          expect(restClient.post).toHaveBeenCalledTimes(1);

          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });
  });

  describe("send then queue", () => {
    describe("basic", () => {
      afterEach(() => tearDown());

      test.each`
        case                               | response                                 | events                 | finalQueue
        ${"events are deleted from queue"} | ${{ status: 200 }}                       | ${[[1, 2, 3], [4, 5]]} | ${[4, 5]}
        ${"events are deleted from queue"} | ${{ status: 300 }}                       | ${[[1, 2, 3], [4, 5]]} | ${[4, 5]}
        ${"events are deleted from queue"} | ${{ status: 400 }}                       | ${[[1, 2, 3], [4, 5]]} | ${[4, 5]}
        ${"events remain in queue"}        | ${{ status: 500 }}                       | ${[[1, 2, 3], [4, 5]]} | ${[1, 2, 3, 4, 5]}
        ${"events remain in queue"}        | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[1, 2, 3, 4, 5]}
      `(
        "$case on $response.status rest response",
        async ({ _, response, events, finalQueue }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(response);

          // queue and save events to storage
          events[0].forEach((id: number) => sdk.event("test", { id: id }));
          eventManager.saveEventsToStorage(userId);

          // Expect to see events in queue
          expectToSeeEventsQueued(eventManager, events[0]);

          await eventManager.sendQueue(userId);
          // Queue up and save extra events after send
          events[1].forEach((id: number) => sdk.event("test", { id: id }));
          eventManager.saveEventsToStorage(userId);

          expect(restClient.post).toHaveBeenCalledTimes(1);
          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });

    describe("with flush", () => {
      afterEach(() => tearDown());

      test.each`
        case                               | response                                 | events                 | finalQueue
        ${"events are deleted from queue"} | ${{ status: 200 }}                       | ${[[1, 2, 3], [4, 5]]} | ${[4, 5]}
        ${"events are deleted from queue"} | ${{ status: 300 }}                       | ${[[1, 2, 3], [4, 5]]} | ${[4, 5]}
        ${"events are deleted from queue"} | ${{ status: 400 }}                       | ${[[1, 2, 3], [4, 5]]} | ${[4, 5]}
        ${"events remain in queue"}        | ${{ status: 500 }}                       | ${[[1, 2, 3], [4, 5]]} | ${[1, 2, 3, 4, 5]}
        ${"events remain in queue"}        | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[1, 2, 3, 4, 5]}
      `(
        "$case on $response.status rest response",
        async ({ _, response, events, finalQueue }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(response);

          // queue and save events to storage
          events[0].forEach((id: number) => sdk.event("test", { id: id }));
          eventManager.saveEventsToStorage(userId);

          // Expect to see events in queue
          expectToSeeEventsQueued(eventManager, events[0]);

          await eventManager.sendQueue(userId);

          // Queue up and save extra events after send
          events[1].forEach((id: number) => sdk.event("test", { id: id }));

          expect(restClient.post).toHaveBeenCalledTimes(1);
          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });
  });

  describe("send events with second response ok", () => {
    describe("with race condition", () => {
      afterEach(() => tearDown());

      test.each`
        firstResponse      | secondResponse     | events                 | networkDelay | finalQueue
        ${{ status: 200 }} | ${{ status: 200 }} | ${[[1, 2, 3], [4, 5]]} | ${50}        | ${[]}
        ${{ status: 300 }} | ${{ status: 200 }} | ${[[1, 2, 3], [4, 5]]} | ${0}         | ${[]}
        ${{ status: 400 }} | ${{ status: 200 }} | ${[[1, 2, 3], [4, 5]]} | ${0}         | ${[]}
      `(
        "events are deleted from queue on $firstResponse.status then $secondResponse.status with network delay $networkDelay milliseconds",
        async ({
          _,
          firstResponse,
          secondResponse,
          events,
          networkDelay,
          finalQueue,
        }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          // queue and save events to storage
          restClient.changeResponse(firstResponse, networkDelay);
          events[0].forEach((id: number) => sdk.event("test", { id: id }));
          const p1 = eventManager.sendQueue(userId);

          restClient.changeResponse(secondResponse);
          // Queue up and save extra events after send
          events[1].forEach((id: number) => sdk.event("test", { id: id }));
          const p2 = eventManager.sendQueue(userId);

          await Promise.all([p1, p2]);

          expect(restClient.post).toHaveBeenCalledTimes(2);
          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });

    describe("with queue sequence", () => {
      afterEach(() => tearDown());

      test.each`
        firstResponse      | secondResponse     | events                 | networkDelay | finalQueue
        ${{ status: 200 }} | ${{ status: 200 }} | ${[[1, 2, 3], [4, 5]]} | ${50}        | ${[]}
        ${{ status: 300 }} | ${{ status: 200 }} | ${[[1, 2, 3], [4, 5]]} | ${0}         | ${[]}
        ${{ status: 400 }} | ${{ status: 200 }} | ${[[1, 2, 3], [4, 5]]} | ${0}         | ${[]}
      `(
        "events are deleted from queue on $firstResponse.status then $secondResponse.status with network delay $networkDelay milliseconds",
        async ({
          firstResponse,
          secondResponse,
          events,
          networkDelay,
          finalQueue,
        }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(firstResponse, networkDelay);

          // queue and save events to storage
          events[0].forEach((id: number) => sdk.event("test", { id: id }));
          await eventManager.sendQueue(userId);

          restClient.changeResponse(secondResponse);
          // Queue up and save extra events after send
          events[1].forEach((id: number) => sdk.event("test", { id: id }));
          await eventManager.sendQueue(userId);

          expect(restClient.post).toHaveBeenCalledTimes(2);
          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });

    describe("with flush and race condition", () => {
      afterEach(() => tearDown());

      test.each`
        firstResponse      | secondResponse     | events                 | networkDelay | finalQueue
        ${{ status: 200 }} | ${{ status: 200 }} | ${[[1, 2, 3], [4, 5]]} | ${50}        | ${[]}
        ${{ status: 300 }} | ${{ status: 200 }} | ${[[1, 2, 3], [4, 5]]} | ${0}         | ${[]}
        ${{ status: 400 }} | ${{ status: 200 }} | ${[[1, 2, 3], [4, 5]]} | ${0}         | ${[]}
      `(
        "events are deleted from queue on $firstResponse.status then $secondResponse.status with network delay $networkDelay milliseconds",
        async ({
          firstResponse,
          secondResponse,
          events,
          networkDelay,
          finalQueue,
        }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(firstResponse, networkDelay);

          // queue and save events to storage
          events[0].forEach((id: number) => sdk.event("test", { id: id }));
          const p1 = eventManager.sendQueue(userId);

          restClient.changeResponse(secondResponse);

          // Queue up and save extra events after send
          events[1].forEach((id: number) => sdk.event("test", { id: id }));
          eventManager.saveEventsToStorage(userId);
          // Expect to see second batch of events in queue
          expectToSeeEventsQueued(eventManager, events[1]);

          const p2 = eventManager.sendQueue(userId);

          await Promise.all([p1, p2]);

          expect(restClient.post).toHaveBeenCalledTimes(2);
          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });

    describe("with queue sequence and flush", () => {
      afterEach(() => tearDown());

      test.each`
        firstResponse      | secondResponse     | events                 | networkDelay | finalQueue
        ${{ status: 200 }} | ${{ status: 200 }} | ${[[1, 2, 3], [4, 5]]} | ${50}        | ${[]}
        ${{ status: 300 }} | ${{ status: 200 }} | ${[[1, 2, 3], [4, 5]]} | ${0}         | ${[]}
        ${{ status: 400 }} | ${{ status: 200 }} | ${[[1, 2, 3], [4, 5]]} | ${0}         | ${[]}
      `(
        "events are deleted from queue on $firstResponse.status then $secondResponse.status with network delay $networkDelay milliseconds",
        async ({
          firstResponse,
          secondResponse,
          events,
          networkDelay,
          finalQueue,
        }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(firstResponse, networkDelay);

          // queue and save events to storage
          events[0].forEach((id: number) => sdk.event("test", { id: id }));
          await eventManager.sendQueue(userId);

          restClient.changeResponse(secondResponse);
          // Queue up and save extra events after send
          events[1].forEach((id: number) => sdk.event("test", { id: id }));
          await eventManager.sendQueue(userId);

          expect(restClient.post).toHaveBeenCalledTimes(2);
          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });
  });

  describe("send queued events fail then ok with race condition", () => {
    describe("basic", () => {
      afterEach(() => tearDown());

      test.each`
        firstResponse                            | secondResponse     | events                 | finalQueue
        ${{ status: 500 }}                       | ${{ status: 200 }} | ${[[1, 2, 3], [4, 5]]} | ${[1, 2, 3]}
        ${{ throwsNetworkError: errorCallback }} | ${{ status: 200 }} | ${[[1, 2, 3], [4, 5]]} | ${[1, 2, 3]}
      `(
        "events are cached on $firstResponse.status then sent $secondResponse.status",
        async ({ firstResponse, secondResponse, events, finalQueue }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(firstResponse);
          // queue and save events to storage
          events[0].forEach((id: number) => sdk.event("test", { id: id }));
          const p1 = eventManager.sendQueue(userId);

          restClient.changeResponse(secondResponse);
          // Queue up and save extra events after send
          events[1].forEach((id: number) => sdk.event("test", { id: id }));
          const p2 = eventManager.sendQueue(userId);

          await Promise.all([p1, p2]);

          expect(restClient.post).toHaveBeenCalledTimes(2);
          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });

    describe("with flush", () => {
      afterEach(() => tearDown());

      test.each`
        firstResponse                            | secondResponse     | events                 | finalQueue
        ${{ status: 500 }}                       | ${{ status: 200 }} | ${[[1, 2, 3], [4, 5]]} | ${[1, 2, 3]}
        ${{ throwsNetworkError: errorCallback }} | ${{ status: 200 }} | ${[[1, 2, 3], [4, 5]]} | ${[1, 2, 3]}
      `(
        "$events are cached on $firstResponse.status then sent $secondResponse.status",
        async ({ firstResponse, secondResponse, events, finalQueue }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(firstResponse);
          // queue and save events to storage
          events[0].forEach((id: number) => sdk.event("test", { id: id }));
          const p1 = eventManager.sendQueue(userId);

          restClient.changeResponse(secondResponse);
          // Queue up and save extra events after send
          events[1].forEach((id: number) => sdk.event("test", { id: id }));
          eventManager.saveEventsToStorage(userId);

          // Expect to see events in queue
          expectToSeeEventsQueued(eventManager, events[1]);

          const p2 = eventManager.sendQueue(userId);

          await Promise.all([p1, p2]);

          expect(restClient.post).toHaveBeenCalledTimes(2);
          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });
  });

  describe("send queued events fail then ok sequence", () => {
    describe("basic", () => {
      afterEach(() => tearDown());

      test.each`
        firstResponse                            | secondResponse     | events                          | finalQueue
        ${{ status: 500 }}                       | ${{ status: 200 }} | ${[[1, 2, 3], [1, 2, 3, 4, 5]]} | ${[]}
        ${{ throwsNetworkError: errorCallback }} | ${{ status: 200 }} | ${[[1, 2, 3], [1, 2, 3, 4, 5]]} | ${[]}
      `(
        "events are cached on $firstResponse.status then deleted from queue on $secondResponse.status",
        async ({ firstResponse, secondResponse, events, finalQueue }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(firstResponse);
          // queue and save events to storage
          events[0].forEach((id: number) => sdk.event("test", { id: id }));
          await eventManager.sendQueue(userId);

          // Expect to see events in queue
          expectToSeeEventsQueued(eventManager, events[0]);

          restClient.changeResponse(secondResponse);
          // Queue up and save extra events after send
          events[1].forEach((id: number) => sdk.event("test", { id: id }));
          await eventManager.sendQueue(userId);

          expect(restClient.post).toHaveBeenCalledTimes(2);
          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });

    describe("with flush", () => {
      afterEach(() => tearDown());

      test.each`
        firstResponse                            | secondResponse     | events                          | finalQueue
        ${{ status: 500 }}                       | ${{ status: 200 }} | ${[[1, 2, 3], [1, 2, 3, 4, 5]]} | ${[]}
        ${{ throwsNetworkError: errorCallback }} | ${{ status: 200 }} | ${[[1, 2, 3], [1, 2, 3, 4, 5]]} | ${[]}
      `(
        "events are cached on $firstResponse.status then deleted from queue on $secondResponse.status",
        async ({ firstResponse, secondResponse, events, finalQueue }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(firstResponse);

          // queue and save events to storage
          events[0].forEach((id: number) => sdk.event("test", { id: id }));
          eventManager.saveEventsToStorage(userId);
          await eventManager.sendQueue(userId);

          // Expect to see events in queue
          expectToSeeEventsQueued(eventManager, events[0]);

          restClient.changeResponse(secondResponse);
          // Queue up and save extra events after send
          events[1].forEach((id: number) => sdk.event("test", { id: id }));
          await eventManager.sendQueue(userId);

          expect(restClient.post).toHaveBeenCalledTimes(2);
          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });
  });

  describe("send queued events second fail sequence", () => {
    describe("basic", () => {
      afterEach(() => tearDown());

      test.each`
        firstResponse      | secondResponse                           | events                 | finalQueue
        ${{ status: 200 }} | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[4, 5]}
        ${{ status: 300 }} | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[4, 5]}
        ${{ status: 400 }} | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[4, 5]}
      `(
        "events are deleted from queue on $firstResponse.status response then cached on unknown",
        async ({ firstResponse, secondResponse, events, finalQueue }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(firstResponse);
          // queue and save events to storage
          events[0].forEach((id: number) => sdk.event("test", { id: id }));
          await eventManager.sendQueue(userId);

          restClient.changeResponse(secondResponse);
          // Queue up and save extra events after send
          events[1].forEach((id: number) => sdk.event("test", { id: id }));
          await eventManager.sendQueue(userId);

          expect(restClient.post).toHaveBeenCalledTimes(2);
          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });

    describe("with race condition", () => {
      afterEach(() => tearDown());

      test.each`
        firstResponse      | secondResponse                           | events                 | finalQueue
        ${{ status: 200 }} | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[4, 5]}
        ${{ status: 300 }} | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[4, 5]}
        ${{ status: 400 }} | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[4, 5]}
      `(
        "events are deleted from queue on $firstResponse.status response then cached on unknown",
        async ({ firstResponse, secondResponse, events, finalQueue }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(firstResponse);

          // queue and save events to storage
          events[0].forEach((id: number) => sdk.event("test", { id: id }));
          const p1 = eventManager.sendQueue(userId);

          restClient.changeResponse(secondResponse);
          // Queue up and save extra events after send
          events[1].forEach((id: number) => sdk.event("test", { id: id }));
          const p2 = eventManager.sendQueue(userId);

          await Promise.all([p1, p2]);

          expect(restClient.post).toHaveBeenCalledTimes(2);
          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });

    describe("basic with flush", () => {
      afterEach(() => tearDown());

      test.each`
        firstResponse      | secondResponse                           | events                 | finalQueue
        ${{ status: 200 }} | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[4, 5]}
        ${{ status: 300 }} | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[4, 5]}
        ${{ status: 400 }} | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[4, 5]}
      `(
        "events are deleted from queue on $firstResponse.status response then cached on unknown",
        async ({ firstResponse, secondResponse, events, finalQueue }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(firstResponse);

          // queue and save events to storage
          events[0].forEach((id: number) => sdk.event("test", { id: id }));
          eventManager.saveEventsToStorage(userId);
          await eventManager.sendQueue(userId);

          restClient.changeResponse(secondResponse);
          // Queue up and save extra events after send
          events[1].forEach((id: number) => sdk.event("test", { id: id }));
          await eventManager.sendQueue(userId);

          expect(restClient.post).toHaveBeenCalledTimes(2);
          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });

    describe("with flush and race condition", () => {
      afterEach(() => tearDown());

      test.each`
        firstResponse      | secondResponse                           | events                 | finalQueue
        ${{ status: 200 }} | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[4, 5]}
        ${{ status: 300 }} | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[4, 5]}
        ${{ status: 400 }} | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[4, 5]}
      `(
        "events are deleted from queue on $firstResponse.status response then cached on unknown",
        async ({ firstResponse, secondResponse, events, finalQueue }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(firstResponse);

          // queue and save events to storage
          events[0].forEach((id: number) => sdk.event("test", { id: id }));
          eventManager.saveEventsToStorage(userId);
          const p1 = eventManager.sendQueue(userId);

          restClient.changeResponse(secondResponse);
          // Queue up and save extra events after send
          events[1].forEach((id: number) => sdk.event("test", { id: id }));
          const p2 = eventManager.sendQueue(userId);

          await Promise.all([p1, p2]);

          expect(restClient.post).toHaveBeenCalledTimes(2);
          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });
  });

  describe("send queued events fail after fail with race condition", () => {
    describe("basic", () => {
      afterEach(() => tearDown());

      test.each`
        firstResponse                            | secondResponse                           | events                 | finalQueue
        ${{ status: 500 }}                       | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[1, 2, 3, 4, 5]}
        ${{ throwsNetworkError: errorCallback }} | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[1, 2, 3, 4, 5]}
      `(
        "events are cached on $firstResponse.status response then cached on unknown",
        async ({ _, firstResponse, secondResponse, events, finalQueue }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(firstResponse);

          // queue and save events to storage
          events[0].forEach((id: number) => sdk.event("test", { id: id }));
          const p1 = eventManager.sendQueue(userId);

          restClient.changeResponse(secondResponse);
          // Queue up and save extra events after send
          events[1].forEach((id: number) => sdk.event("test", { id: id }));
          const p2 = eventManager.sendQueue(userId);

          await Promise.all([p1, p2]);

          expect(restClient.post).toHaveBeenCalledTimes(2);
          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });

    describe("with flush", () => {
      afterEach(() => tearDown());

      test.each`
        firstResponse                            | secondResponse                           | events                 | finalQueue
        ${{ status: 500 }}                       | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[1, 2, 3, 4, 5]}
        ${{ throwsNetworkError: errorCallback }} | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[1, 2, 3, 4, 5]}
      `(
        "events are cached on $firstResponse.status response then cached on unknown",
        async ({ firstResponse, secondResponse, events, finalQueue }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(firstResponse);

          // queue and save events to storage
          events[0].forEach((id: number) => sdk.event("test", { id: id }));
          eventManager.saveEventsToStorage(userId);
          const p1 = eventManager.sendQueue(userId);

          restClient.changeResponse(secondResponse);
          // Queue up and save extra events after send
          events[1].forEach((id: number) => sdk.event("test", { id: id }));
          const p2 = eventManager.sendQueue(userId);

          await Promise.all([p1, p2]);

          expect(restClient.post).toHaveBeenCalledTimes(2);
          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });
  });

  describe("send queued events fail after fail sequence", () => {
    describe("basic", () => {
      afterEach(() => tearDown());

      test.each`
        firstResponse                            | secondResponse                           | events                 | finalQueue
        ${{ status: 500 }}                       | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[1, 2, 3, 4, 5]}
        ${{ throwsNetworkError: errorCallback }} | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[1, 2, 3, 4, 5]}
      `(
        "events are cached on $firstResponse.status response then cached on unknown",
        async ({ firstResponse, secondResponse, events, finalQueue }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(firstResponse);

          // queue and save events to storage
          events[0].forEach((id: number) => sdk.event("test", { id: id }));
          await eventManager.sendQueue(userId);

          // Expect to see events in queue
          expectToSeeEventsQueued(eventManager, events[0]);

          restClient.changeResponse(secondResponse);
          // Queue up and save extra events after send
          events[1].forEach((id: number) => sdk.event("test", { id: id }));
          await eventManager.sendQueue(userId);

          expect(restClient.post).toHaveBeenCalledTimes(2);
          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });

    describe("with flush", () => {
      afterEach(() => tearDown());

      test.each`
        firstResponse                            | secondResponse                           | events                 | finalQueue
        ${{ status: 500 }}                       | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[1, 2, 3, 4, 5]}
        ${{ throwsNetworkError: errorCallback }} | ${{ throwsNetworkError: errorCallback }} | ${[[1, 2, 3], [4, 5]]} | ${[1, 2, 3, 4, 5]}
      `(
        "events are cached on $firstResponse.status response then cached on unknown",
        async ({ firstResponse, secondResponse, events, finalQueue }) => {
          jest.spyOn(MockSwrveRestClient.prototype, "post");
          restClient.changeResponse(firstResponse);

          // queue and save events to storage
          events[0].forEach((id: number) => sdk.event("test", { id: id }));
          eventManager.saveEventsToStorage(userId);
          await eventManager.sendQueue(userId);

          // Expect to see events in queue
          expectToSeeEventsQueued(eventManager, events[0]);

          restClient.changeResponse(secondResponse);
          // Queue up and save extra events after send
          events[1].forEach((id: number) => sdk.event("test", { id: id }));
          await eventManager.sendQueue(userId);

          expect(restClient.post).toHaveBeenCalledTimes(2);
          // Check queue at after restClient response resolve or reject
          expectToSeeEventsQueued(eventManager, finalQueue);
        }
      );
    });
  });
});