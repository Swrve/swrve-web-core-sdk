import {CampaignManager} from "../src/Campaigns/CampaignManager";
import { StorageManager } from "../src/Storage/StorageManager";
import {
    ISwrveTrigger,
    ISwrveCampaignResourceResponse,
    ISwrveMessage,
    ISwrveCampaign,
} from '../src/interfaces/ISwrveCampaign';
import {ProfileManager} from "../src/Profile/ProfileManager";
import { SwrveCoreSDK } from "../src/SwrveCoreSDK";
import PlatformMock from "./mocks/PlatformMock";

const pal = new PlatformMock();
const storageManager = new StorageManager(pal);
const user = {userId: "SwrveUser", sessionToken: "abc", nextSeqNum: 1, sessionStart: Date.now(), isQAUser: false, qaUserNextSeqNum: 0};
const profileManager = new ProfileManager(user.userId, 30512, "key", 1000, storageManager);
const cm = new CampaignManager(profileManager, pal, storageManager);
const impressionHandler = (msg: ISwrveMessage) => {};
const onAssetsLoaded = () => {};

const twoDays = 172800000;
import _campaignTemplate = require("./resources/json/CampaignManagerTriggerTests-campaignTemplate.json");
const campaignTemplate: ISwrveCampaign = _campaignTemplate as any;
campaignTemplate.start_date = Date.now() - twoDays;
campaignTemplate.end_date = Date.now() + twoDays;
campaignTemplate.rules.min_delay_between_messages = Date.now() + twoDays;

import _data1 = require("./resources/json/CampaignManagerTriggerTests-data1.json");
import { SWRVE_IAM_OVERLAY } from "../src/Campaigns/Messages/SwrveInAppConstants";

const data1: ISwrveCampaignResourceResponse = _data1 as any;
data1.campaigns.campaigns = [{
    ...campaignTemplate,
    ...data1.campaigns.campaigns[0],
}];

const cleanUpDom = () => {
    const iamContainer = document.getElementById(SWRVE_IAM_OVERLAY);
    if (iamContainer) {
        document.body.removeChild(iamContainer);
    }
};

const moveIAMOffscreen = () => {
    const container = document.getElementById(SWRVE_IAM_OVERLAY);

    if (container) {
        container!.style.left = "-10000px";
    }
};

jest.spyOn(SwrveCoreSDK, "getPlatform").mockReturnValue( new PlatformMock);

describe("Campaign Manager Trigger Tests", () => {
    it("triggers with payload", () => {
        const triggerJSON: ISwrveTrigger = {
            event_name: "test.eventName",
            conditions: {
                args: [
                    { key: "key1", value: "value1", op: "eq" },
                    { key: "key2", value: "value2", op: "eq" },
                ],
                op: "and",
            },
        };
        expect(cm.canTriggerWithPayload(triggerJSON, { key1: "value1", key2: "value2" })).toBe(true);
    });

    it("does not trigger with payload", () => {
        const triggerJSON: ISwrveTrigger = {
            event_name: "test.eventName",
            conditions: {
                args: [
                    { key: "key1", value: "value1", op: "eq" },
                    { key: "key2", value: "value2", op: "eq" },
                ],
                op: "and",
            },
        };
        expect(cm.canTriggerWithPayload(triggerJSON, { key1: "value1" })).toBe(false);
        expect(cm.canTriggerWithPayload(triggerJSON, {})).toBe(false);
        expect(cm.canTriggerWithPayload(triggerJSON, null)).toBe(false);
        expect(cm.canTriggerWithPayload(triggerJSON, { key2: "value2" })).toBe(false);
    });

    it("triggers simple eq condition", () => {
        const triggerJSON: ISwrveTrigger = {
            event_name: "test.eventName",
            conditions: { key: "key1", value: "value1", op: "eq" },
        };
        expect(cm.canTriggerWithPayload(triggerJSON, { key1: "value1", key2: "value2" })).toBe(true);
        expect(cm.canTriggerWithPayload(triggerJSON, { key1: "VALUE1" })).toBe(true);
        expect(cm.canTriggerWithPayload(triggerJSON, { key2: "value2" })).toBe(false);
        expect(cm.canTriggerWithPayload(triggerJSON, {})).toBe(false);
    });

    it("triggers contains condition case-insensitively", () => {
        const triggerJSON: ISwrveTrigger = {
            event_name: "test.eventName",
            conditions: { key: "destination", value: "dub", op: "contains" },
        };
        expect(cm.canTriggerWithPayload(triggerJSON, { destination: "Dublin" })).toBe(true);
        expect(cm.canTriggerWithPayload(triggerJSON, { destination: "London" })).toBe(false);
        expect(cm.canTriggerWithPayload(triggerJSON, {})).toBe(false);
    });

    it("triggers contains condition for numeric payloads", () => {
        const triggerJSON: ISwrveTrigger = {
            event_name: "test.eventName",
            conditions: { key: "passengers", value: "12", op: "contains" },
        };
        expect(cm.canTriggerWithPayload(triggerJSON, { passengers: 123 })).toBe(true);
        expect(cm.canTriggerWithPayload(triggerJSON, { passengers: 45 })).toBe(false);
    });

    it("triggers numeric equals condition", () => {
        const triggerJSON: ISwrveTrigger = {
            event_name: "test.eventName",
            conditions: { key: "score", value: 10, op: "number_eq" },
        };
        expect(cm.canTriggerWithPayload(triggerJSON, { score: 10 })).toBe(true);
        expect(cm.canTriggerWithPayload(triggerJSON, { score: "10" })).toBe(true);
        expect(cm.canTriggerWithPayload(triggerJSON, { score: 11 })).toBe(false);
        expect(cm.canTriggerWithPayload(triggerJSON, {})).toBe(false);
    });

    it("triggers numeric greater than condition", () => {
        const triggerJSON: ISwrveTrigger = {
            event_name: "test.eventName",
            conditions: { key: "score", value: 10, op: "number_gt" },
        };
        expect(cm.canTriggerWithPayload(triggerJSON, { score: 11 })).toBe(true);
        expect(cm.canTriggerWithPayload(triggerJSON, { score: "11" })).toBe(true);
        expect(cm.canTriggerWithPayload(triggerJSON, { score: 10 })).toBe(false);
        expect(cm.canTriggerWithPayload(triggerJSON, { score: 9 })).toBe(false);
    });

    it("triggers numeric less than condition", () => {
        const triggerJSON: ISwrveTrigger = {
            event_name: "test.eventName",
            conditions: { key: "score", value: 10, op: "number_lt" },
        };
        expect(cm.canTriggerWithPayload(triggerJSON, { score: 9 })).toBe(true);
        expect(cm.canTriggerWithPayload(triggerJSON, { score: "9" })).toBe(true);
        expect(cm.canTriggerWithPayload(triggerJSON, { score: 10 })).toBe(false);
        expect(cm.canTriggerWithPayload(triggerJSON, { score: 11 })).toBe(false);
    });

    it("triggers numeric between condition with exclusive bounds", () => {
        const triggerJSON: ISwrveTrigger = {
            event_name: "test.eventName",
            conditions: { key: "score", value: { lower: 10, upper: 20 }, op: "number_between" },
        };
        expect(cm.canTriggerWithPayload(triggerJSON, { score: 11 })).toBe(true);
        expect(cm.canTriggerWithPayload(triggerJSON, { score: "19" })).toBe(true);
        expect(cm.canTriggerWithPayload(triggerJSON, { score: 10 })).toBe(false);
        expect(cm.canTriggerWithPayload(triggerJSON, { score: 20 })).toBe(false);
    });

    it("triggers numeric not between condition with exclusive bounds", () => {
        const triggerJSON: ISwrveTrigger = {
            event_name: "test.eventName",
            conditions: { key: "score", value: { lower: 10, upper: 20 }, op: "number_not_between" },
        };
        expect(cm.canTriggerWithPayload(triggerJSON, { score: 9 })).toBe(true);
        expect(cm.canTriggerWithPayload(triggerJSON, { score: "21" })).toBe(true);
        expect(cm.canTriggerWithPayload(triggerJSON, { score: 10 })).toBe(false);
        expect(cm.canTriggerWithPayload(triggerJSON, { score: 20 })).toBe(false);
        expect(cm.canTriggerWithPayload(triggerJSON, { score: 15 })).toBe(false);
    });

    it("triggers when any or condition passes", () => {
        const triggerJSON: ISwrveTrigger = {
            event_name: "test.eventName",
            conditions: {
                args: [
                    { key: "origin", value: "DUB", op: "eq" },
                    { key: "destination", value: "York", op: "contains" },
                ],
                op: "or",
            },
        };
        expect(cm.canTriggerWithPayload(triggerJSON, { origin: "LHR", destination: "New York" })).toBe(true);
        expect(cm.canTriggerWithPayload(triggerJSON, { origin: "dub", destination: "London" })).toBe(true);
        expect(cm.canTriggerWithPayload(triggerJSON, { origin: "LHR", destination: "London" })).toBe(false);
    });

    it("invalid trigger unknown operator", () => {

        const triggerJSON: ISwrveTrigger = {
            event_name: "test.eventName",
            conditions: {
                args: [
                    { key: "key1", value: "value1", op: "eq" },
                    { key: "key2", value: "value2", op: "eq" },
                ],
                // @ts-ignore: Testing handling of invalid arguments
                op: "random",
            },
        };
        expect(cm.canTriggerWithPayload(triggerJSON, { key1: "value1", key2: "value2" })).toBe(false);
    });

    it("invalid trigger no operator", () => {
        const triggerJSON: ISwrveTrigger = <ISwrveTrigger> {
            event_name: "test.eventName",
            conditions: {
                args: [
                    { key: "key1", value: "value1", op: "eq" },
                    { key: "key2", value: "value2", op: "eq" },
                ],
            },
        };
        expect(cm.canTriggerWithPayload(triggerJSON, { key1: "value1", key2: "value2" })).toBe(false);
    });

    it("empty condition always passes", () => {
        const triggerJSON: ISwrveTrigger = {
            event_name: "test.eventName",
            conditions: {},
        };
        expect(cm.canTriggerWithPayload(triggerJSON, { key1: "value1", key2: "value2" })).toBe(true);
        expect(cm.canTriggerWithPayload(triggerJSON, {})).toBe(true);
    });

    it("missing conditions gets treated like empty condition", () => {
        const triggerJSON: ISwrveTrigger = {
            event_name: "test.eventName",
        };
        expect(cm.canTriggerWithPayload(triggerJSON, { key1: "value1", key2: "value2" })).toBe(true);
        expect(cm.canTriggerWithPayload(triggerJSON, {})).toBe(true);
    });

    it("does not break on invalid triggers", () => {
        // @ts-ignore: Testing handling of invalid arguments
        expect(cm.canTriggerWithPayload(null, {})).toBe(false);
        // @ts-ignore: Testing handling of invalid arguments
        expect(cm.canTriggerWithPayload(undefined, {})).toBe(false);
    });

    it("campaign trigger one", () => {
        pal.synchronousStorage.clear();
        const cm = new CampaignManager(profileManager, pal, storageManager);
        cleanUpDom();
        const showMessage = jest.fn();
        // @ts-ignore: Instrumenting private method
        cm.messageDisplayManager.showMessage = showMessage
        cm.storeCampaigns(data1, {}, onAssetsLoaded);
        cm.checkTriggers("song1.played", { artist: "prince", song: "purple rain" }, impressionHandler);
        moveIAMOffscreen();
        expect(showMessage).toHaveBeenCalled();
        // jest mock produces a matrix of calls and arguments within
        const message: ISwrveMessage = showMessage.mock.calls[0][0];
        expect(message.id).toBe(campaignTemplate.message!.id);
    });

    it("campaign trigger two", () => {
        pal.synchronousStorage.clear();
        const cm = new CampaignManager(profileManager, pal, storageManager);
        cleanUpDom();
        const showMessage = jest.fn();
        // @ts-ignore: Instrumenting private method
        cm.messageDisplayManager.showMessage = showMessage;
        cm.storeCampaigns(data1, {}, onAssetsLoaded);
        cm.checkTriggers("song2.played", { artist: "prince" }, impressionHandler);
        moveIAMOffscreen();
        expect(showMessage).toHaveBeenCalled();
        const message: ISwrveMessage = showMessage.mock.calls[0][0];
        expect(message.id).toBe(campaignTemplate.message!.id);
    });

    it("campaign trigger three", () => {
        pal.synchronousStorage.clear();
        const cm = new CampaignManager(profileManager, pal, storageManager);
        cleanUpDom();
        const showMessage = jest.fn()
        // @ts-ignore: Instrumenting private method
        cm.messageDisplayManager.showMessage = showMessage;
        cm.storeCampaigns(data1, {}, onAssetsLoaded);
        cm.checkTriggers("song3.played", {}, impressionHandler);
        expect(showMessage).toHaveBeenCalled();
        const message: ISwrveMessage = showMessage.mock.calls[0][0];
        expect(message.id).toBe(campaignTemplate.message!.id);
    });

    it("campaign trigger one not satisfied", () => {
        const cm = new CampaignManager(profileManager, pal, storageManager);
        cleanUpDom();
        const showMessage = jest.fn();
        // @ts-ignore: Instrumenting private method
        cm.messageDisplayManager.showMessage = showMessage;
        cm.storeCampaigns(data1, {}, onAssetsLoaded);
        cm.checkTriggers("song1.played", { artist: "prince" }, impressionHandler);
        moveIAMOffscreen();
        expect(showMessage).not.toHaveBeenCalled();
    });

    it("campaign trigger name not matching", () => {
        const cm = new CampaignManager(profileManager, pal, storageManager);
        cleanUpDom();
        const showMessage = jest.fn();
        // @ts-ignore: Instrumenting private method
        cm.messageDisplayManager.showMessage = showMessage;
        cm.storeCampaigns(data1, {}, onAssetsLoaded);
        cm.checkTriggers("test.event", {}, impressionHandler);
        moveIAMOffscreen();
        expect(showMessage).not.toHaveBeenCalled();
    });
});
