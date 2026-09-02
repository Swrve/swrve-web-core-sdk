import { CampaignManager } from "../src/Campaigns/CampaignManager";
import { ProfileManager } from "../src/Profile/ProfileManager";
import { StorageManager } from "../src/Storage/StorageManager";
import { SwrveCoreSDK } from "../src/SwrveCoreSDK";
import {
  ISwrveCampaignResourceResponse,
  ISwrveMessage,
} from "../src/interfaces/ISwrveCampaign";
import PlatformMock from "./mocks/PlatformMock";
import HTMLSwrveInAppElement from "../src/Campaigns/Messages/HTMLSwrveInAppElement";
const twoDays = 172800000;

import _oneButton = require("./resources/json/SwrveMessageDisplayManagerTests-oneButton.json");
const oneButton: ISwrveCampaignResourceResponse = _oneButton as any;
oneButton.campaigns.campaigns[0].start_date = Date.now() - twoDays;
oneButton.campaigns.campaigns[0].end_date = Date.now() + twoDays;
oneButton.campaigns.campaigns[0].rules.min_delay_between_messages =
  Date.now() + twoDays;

import _twoButtons = require("./resources/json/SwrveMessageDisplayManagerTests-twoButtons.json");
const twoButtons: ISwrveCampaignResourceResponse = _twoButtons as any;
twoButtons.campaigns.campaigns[0].start_date = Date.now() - twoDays;
twoButtons.campaigns.campaigns[0].end_date = Date.now() + twoDays;
twoButtons.campaigns.campaigns[0].rules.min_delay_between_messages =
  Date.now() + twoDays;

import _threeButtons = require("./resources/json/SwrveMessageDisplayManagerTests-threeButtons.json");
const threeButtons: ISwrveCampaignResourceResponse = _threeButtons as any;
threeButtons.campaigns.campaigns[0].start_date = Date.now() - twoDays;
threeButtons.campaigns.campaigns[0].end_date = Date.now() + twoDays;
threeButtons.campaigns.campaigns[0].rules.min_delay_between_messages =
  Date.now() + twoDays;

import _oneImage = require("./resources/json/SwrveMessageDisplayManagerTests-oneImage.json");
const oneImage: ISwrveCampaignResourceResponse = _oneImage as any;
oneImage.campaigns.campaigns[0].start_date = Date.now() - twoDays;
oneImage.campaigns.campaigns[0].end_date = Date.now() + twoDays;

import _scaled = require("./resources/json/SwrveMessageDisplayManagerTests-scaled.json");

const scaled: ISwrveCampaignResourceResponse = _scaled as any;
scaled.campaigns.campaigns[0].start_date = Date.now() - twoDays;
scaled.campaigns.campaigns[0].end_date = Date.now() + twoDays;
scaled.campaigns.campaigns[0].rules.min_delay_between_messages =
  Date.now() + twoDays;

const multipageCampaign: any = {
  id: 735029,
  start_date: Date.now() - twoDays,
  end_date: Date.now() + twoDays,
  rules: {
    delay_first_message: 0,
    dismiss_after_views: 99999,
    display_order: "random",
    min_delay_between_messages: 0,
  },
  triggers: [],
  message_center: true,
  subject: "Multipage IAM",
  message: {
    id: 740417,
    name: "Multipage IAM",
    rules: { orientations: "landscape" },
    priority: 9999,
    template: {
      formats: [
        {
          name: "landscape",
          orientation: "landscape",
          language: "*",
          size: { w: { type: "number", value: 320 }, h: { type: "number", value: 180 } },
          images: [],
          buttons: [],
          scaled_by: 1,
          scaled_from: "landscape",
          scale: 1,
          pages: [
            {
              page_id: 1,
              page_name: "first",
              images: [],
              buttons: [
                {
                  name: "Next",
                  x: { type: "number", value: 0 },
                  y: { type: "number", value: 0 },
                  w: { type: "number", value: 120 },
                  h: { type: "number", value: 50 },
                  image_width: 120,
                  image_height: 50,
                  image_filename: "next.png",
                  type: { type: "text", value: "PAGE_LINK" },
                  action: { type: "text", value: "2" },
                  game_id: { type: "number", value: "" },
                  image_up: { type: "asset", value: "next.png" },
                  events: [
                    {
                      name: "bw.test",
                      payload: [
                        { key: "prop 1", value: "value is ${user.name}" },
                      ],
                    },
                  ],
                  user_updates: [
                    { key: "user.update", value: "update is ${user.name}" },
                  ],
                },
              ],
            },
            {
              page_id: 2,
              page_name: "second",
              images: [
                {
                  name: "Page 2 Text",
                  x: { type: "number", value: 0 },
                  y: { type: "number", value: 0 },
                  w: { type: "number", value: 120 },
                  h: { type: "number", value: 50 },
                  color: { type: "color", value: "FFFFFF" },
                  image_filename: "",
                  image_height: 0,
                  image_width: 0,
                  dynamic_image_url: "https://example.com/page-2.png",
                },
              ],
              buttons: [],
            },
          ],
        },
      ],
    },
  },
};

const zIndexCampaign: any = {
  id: 735030,
  start_date: Date.now() - twoDays,
  end_date: Date.now() + twoDays,
  rules: {
    delay_first_message: 0,
    dismiss_after_views: 99999,
    display_order: "random",
    min_delay_between_messages: 0,
  },
  triggers: [],
  message_center: false,
  subject: "IAM z-index",
  message: {
    id: 740418,
    name: "IAM z-index",
    rules: { orientations: "landscape" },
    priority: 9999,
    template: {
      formats: [
        {
          name: "landscape",
          orientation: "landscape",
          language: "*",
          size: { w: { type: "number", value: 320 }, h: { type: "number", value: 180 } },
          scaled_by: 1,
          scaled_from: "landscape",
          scale: 1,
          images: [
            {
              name: "Background",
              iam_z_index: 2,
              x: { type: "number", value: 0 },
              y: { type: "number", value: 0 },
              w: { type: "number", value: 320 },
              h: { type: "number", value: 180 },
              color: { type: "color", value: "FFFFFF" },
              image_filename: "",
              image_height: 180,
              image_width: 320,
              dynamic_image_url: "https://example.com/background.png",
            },
            {
              name: "Back Image",
              iam_z_index: 0,
              x: { type: "number", value: 0 },
              y: { type: "number", value: 0 },
              w: { type: "number", value: 120 },
              h: { type: "number", value: 50 },
              color: { type: "color", value: "FFFFFF" },
              image_filename: "",
              image_height: 50,
              image_width: 120,
              dynamic_image_url: "https://example.com/back.png",
            },
          ],
          buttons: [
            {
              name: "Front",
              iam_z_index: 3,
              x: { type: "number", value: 0 },
              y: { type: "number", value: 0 },
              w: { type: "number", value: 80 },
              h: { type: "number", value: 40 },
              image_width: 80,
              image_height: 40,
              image_filename: "",
              type: { type: "text", value: "DISMISS" },
              action: { type: "text", value: "" },
              game_id: { type: "number", value: "" },
              image_up: { type: "asset", value: "front.png" },
            },
            {
              name: "Middle",
              iam_z_index: 1,
              x: { type: "number", value: 0 },
              y: { type: "number", value: 0 },
              w: { type: "number", value: 80 },
              h: { type: "number", value: 40 },
              image_width: 80,
              image_height: 40,
              image_filename: "",
              type: { type: "text", value: "DISMISS" },
              action: { type: "text", value: "" },
              game_id: { type: "number", value: "" },
              image_up: { type: "asset", value: "middle.png" },
            },
          ],
        },
      ],
    },
  },
};

const videoCampaign: any = {
  id: 735031,
  start_date: Date.now() - twoDays,
  end_date: Date.now() + twoDays,
  rules: {
    delay_first_message: 0,
    dismiss_after_views: 99999,
    display_order: "random",
    min_delay_between_messages: 0,
  },
  triggers: [],
  message_center: false,
  subject: "Video IAM",
  message: {
    id: 740419,
    name: "Video IAM",
    rules: { orientations: "landscape" },
    priority: 9999,
    template: {
      formats: [
        {
          name: "landscape",
          orientation: "landscape",
          language: "*",
          size: { w: { type: "number", value: 320 }, h: { type: "number", value: 180 } },
          scaled_by: 1,
          scaled_from: "landscape",
          scale: 1,
          pages: [
            {
              page_id: 10,
              page_name: "video-page",
              images: [
                {
                  name: "Background",
                  x: { type: "number", value: 0 },
                  y: { type: "number", value: 0 },
                  w: { type: "number", value: 320 },
                  h: { type: "number", value: 180 },
                  color: { type: "color", value: "FFFFFF" },
                  image_filename: "",
                  image_height: 180,
                  image_width: 320,
                  dynamic_image_url: "https://example.com/background.png",
                },
                {
                  name: "Video",
                  x: { type: "number", value: 0 },
                  y: { type: "number", value: 0 },
                  w: { type: "number", value: 320 },
                  h: { type: "number", value: 180 },
                  color: { type: "color", value: "FFFFFF" },
                  image_filename: "",
                  image_height: 180,
                  image_width: 320,
                  dynamic_image_url: "https://example.com/video.mp4",
                  media_format: "mp4",
                  media_id: 42,
                  accessibility_text: "Video",
                  video_settings: {
                    auto_play: false,
                    loop: false,
                    fill_screen: true,
                    show_controls: true,
                  },
                },
              ],
              buttons: [],
            },
          ],
          images: [],
          buttons: [],
        },
      ],
    },
  },
};

const storyCampaign: any = {
  id: 735032,
  start_date: Date.now() - twoDays,
  end_date: Date.now() + twoDays,
  rules: {
    delay_first_message: 0,
    dismiss_after_views: 99999,
    display_order: "random",
    min_delay_between_messages: 0,
  },
  triggers: [],
  message_center: false,
  subject: "Story IAM",
  message: {
    id: 740420,
    name: "Story IAM",
    rules: { orientations: "landscape" },
    priority: 9999,
    template: {
      formats: [
        {
          name: "landscape",
          orientation: "landscape",
          language: "*",
          size: { w: { type: "number", value: 320 }, h: { type: "number", value: 180 } },
          scaled_by: 1,
          scaled_from: "landscape",
          scale: 1,
          story_settings: {
            page_duration: 5000,
            last_page_progression: "dismiss",
            last_page_dismiss_id: 99,
            last_page_dismiss_name: "Story Complete",
            padding: {
              top: 10,
              right: 12,
              left: 12,
            },
            progress_bar: {
              bar_color: "#FFFFFFFF",
              bg_color: "#66000000",
              h: 4,
              segment_gap: 3,
            },
            gestures_enabled: true,
            dismiss_button: {
              id: 88,
              name: "Story Dismiss",
              color: "#FFFFFFFF",
              pressed_color: "#FFFF0000",
              focused_color: "#FF00FF00",
              size: 24,
              margin_top: 8,
              accessibility_text: "Close story",
            },
          },
          pages: [
            {
              page_id: 1,
              page_name: "story-one",
              page_duration: 1000,
              images: [
                {
                  name: "Page 1",
                  x: { type: "number", value: 0 },
                  y: { type: "number", value: 0 },
                  w: { type: "number", value: 320 },
                  h: { type: "number", value: 180 },
                  color: { type: "color", value: "FFFFFF" },
                  image_filename: "",
                  image_height: 180,
                  image_width: 320,
                  dynamic_image_url: "https://example.com/story-1.png",
                },
              ],
              buttons: [],
            },
            {
              page_id: 2,
              page_name: "story-two",
              images: [
                {
                  name: "Page 2",
                  x: { type: "number", value: 0 },
                  y: { type: "number", value: 0 },
                  w: { type: "number", value: 320 },
                  h: { type: "number", value: 180 },
                  color: { type: "color", value: "FFFFFF" },
                  image_filename: "",
                  image_height: 180,
                  image_width: 320,
                  dynamic_image_url: "https://example.com/story-2.png",
                },
              ],
              buttons: [],
            },
          ],
          images: [],
          buttons: [],
        },
      ],
    },
  },
};

const portraitOnlyCampaign: any = {
  id: 735031,
  start_date: Date.now() - twoDays,
  end_date: Date.now() + twoDays,
  rules: {
    delay_first_message: 0,
    dismiss_after_views: 99999,
    display_order: "random",
    min_delay_between_messages: 0,
  },
  triggers: [],
  message_center: false,
  subject: "Portrait IAM",
  message: {
    id: 740419,
    name: "Portrait IAM",
    rules: { orientations: "both" },
    priority: 9999,
    template: {
      formats: [
        {
          name: "portrait",
          orientation: "portrait",
          language: "*",
          size: { w: { type: "number", value: 200 }, h: { type: "number", value: 300 } },
          images: [
            {
              name: "Background",
              x: { type: "number", value: 0 },
              y: { type: "number", value: 0 },
              w: { type: "number", value: 200 },
              h: { type: "number", value: 300 },
              color: { type: "color", value: "FFFFFF" },
              image_filename: "",
              image_height: 300,
              image_width: 200,
              dynamic_image_url: "https://example.com/portrait.png",
            },
          ],
          buttons: [],
          scaled_by: 1,
          scaled_from: "portrait",
          scale: 1,
        },
      ],
    },
  },
};

// setup global vars
let impressionHandler = (msg: ISwrveMessage) => {};
let onQATriggerCallback = () => {};
let platform = new PlatformMock();
let storageManager = new StorageManager(platform);
let user = {
  userId: "SwrveUser",
  sessionToken: "abc",
  nextSeqNum: 1,
  sessionStart: Date.now(),
  isQAUser: false,
  qaUserNextSeqNum: 0,
};
/* Two formats, each with the same page ids, so a format switch can be observed
 * independently of page position. Canvas dimensions differ per format so the
 * rendered format is identifiable from message.canvasWidth/canvasHeight. */
const twoFormatPages = (pageLinkButtonName: string): any[] => [
  {
    page_id: 1,
    page_name: "first",
    images: [],
    buttons: [
      {
        name: pageLinkButtonName,
        x: { type: "number", value: 0 },
        y: { type: "number", value: 0 },
        w: { type: "number", value: 120 },
        h: { type: "number", value: 50 },
        image_width: 120,
        image_height: 50,
        image_filename: "next.png",
        type: { type: "text", value: "PAGE_LINK" },
        action: { type: "text", value: "2" },
        game_id: { type: "number", value: "" },
        image_up: { type: "asset", value: "next.png" },
      },
    ],
  },
  {
    page_id: 2,
    page_name: "second",
    images: [
      {
        name: "Page 2 Text",
        x: { type: "number", value: 0 },
        y: { type: "number", value: 0 },
        w: { type: "number", value: 120 },
        h: { type: "number", value: 50 },
        color: { type: "color", value: "FFFFFF" },
        image_filename: "",
        image_height: 0,
        image_width: 0,
        dynamic_image_url: "https://example.com/page-2.png",
      },
    ],
    buttons: [],
  },
];

const twoFormatCampaign: any = {
  id: 735030,
  start_date: Date.now() - twoDays,
  end_date: Date.now() + twoDays,
  rules: {
    delay_first_message: 0,
    dismiss_after_views: 99999,
    display_order: "random",
    min_delay_between_messages: 0,
  },
  triggers: [],
  message_center: true,
  subject: "Two format IAM",
  message: {
    id: 740430,
    name: "Two format IAM",
    rules: { orientations: "both" },
    priority: 9999,
    template: {
      formats: [
        {
          name: "landscape",
          orientation: "landscape",
          language: "*",
          size: { w: { type: "number", value: 320 }, h: { type: "number", value: 180 } },
          images: [],
          buttons: [],
          scaled_by: 1,
          scaled_from: "landscape",
          scale: 1,
          pages: twoFormatPages("Next"),
        },
        {
          name: "portrait",
          orientation: "portrait",
          language: "*",
          size: { w: { type: "number", value: 180 }, h: { type: "number", value: 320 } },
          images: [],
          buttons: [],
          scaled_by: 1,
          scaled_from: "portrait",
          scale: 1,
          pages: twoFormatPages("Next"),
        },
      ],
    },
  },
};

/** Sets the viewport dimensions and fires the resize event the SDK listens for. */
const resizeViewportTo = (width: number, height: number): void => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: height });
  window.dispatchEvent(new Event("resize"));
};

/** Comfortably longer than the display manager's resize debounce. */
const AFTER_RESIZE_DEBOUNCE_MS = 300;

let profileManager = new ProfileManager(
  user.userId,
  30512,
  "apiKey",
  1000,
  storageManager
);
let campaignManager = new CampaignManager(profileManager, platform, storageManager);

describe("MESSAGE DISPLAY MANAGER TESTS", () => {
  jest.spyOn(SwrveCoreSDK, "getPlatform").mockReturnValue(new PlatformMock());

  beforeEach(async () => {
    platform
      .init(["language", "countryCode", "timezone", "firmware"])
      .then(() => {
        platform.synchronousStorage.clear();
        campaignManager = new CampaignManager(profileManager, platform, storageManager);
      });
  });

  it("adds IAM container and one button", (done) => {
    campaignManager.storeCampaigns(oneButton, {}, () => {
      campaignManager.checkTriggers("tv.event_simple", {}, impressionHandler, true);
      const iamItem = document.getElementsByTagName("swrve-in-app-message")[0] as HTMLSwrveInAppElement;
      expect(iamItem.shadowRoot?.getElementById("swrveIAM__button-0")).not.toBeNull();
      done();
    });
  });

  it("adds IAM container and two buttons", (done) => {
    campaignManager.storeCampaigns(twoButtons, {}, () => {
      campaignManager.checkTriggers("tv.event_simple", {}, impressionHandler, true);
      const iamItem = document.getElementsByTagName("swrve-in-app-message")[0] as HTMLSwrveInAppElement;
      expect(iamItem.shadowRoot?.getElementById("swrveIAM__button-0")).not.toBeNull();

      done();
    });
  });

  it("adds IAM container and three buttons", (done) => {
    campaignManager.storeCampaigns(threeButtons, {}, () => {
      campaignManager.checkTriggers("tv.event_simple", {}, impressionHandler, true);

      const iamItem = document.getElementsByTagName("swrve-in-app-message")[0] as HTMLSwrveInAppElement;
      expect(iamItem.shadowRoot?.getElementById("swrveIAM__button-0")).not.toBeNull();
      expect(iamItem.shadowRoot?.getElementById("swrveIAM__button-1")).not.toBeNull();
      expect(iamItem.shadowRoot?.getElementById("swrveIAM__button-2")).not.toBeNull();

      done();
    });
  });

  it("adds IAM container and one image", (done) => {
    campaignManager.storeCampaigns(oneImage, {}, () => {
      campaignManager.checkTriggers("tv.event_simple", {}, impressionHandler, true);

      const iamItem = document.getElementsByTagName("swrve-in-app-message")[0] as HTMLSwrveInAppElement;
      expect(iamItem.shadowRoot?.getElementById("swrveIAM__image-0")).not.toBeNull();

      done();
    });
  });

  it("shows portrait-only IAMs when current orientation is portrait", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 400 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });

    campaignManager.showCampaign(portraitOnlyCampaign);

    const iamItems = document.getElementsByTagName("swrve-in-app-message");
    const iamItem = iamItems[iamItems.length - 1] as HTMLSwrveInAppElement;
    expect((iamItem as any).message.canvasWidth).toBe(200);
    expect((iamItem as any).message.canvasHeight).toBe(300);
    expect(iamItem.shadowRoot?.getElementById("swrveIAM__image-0")).not.toBeNull();

    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 768 });
  });

  it("applies scale", () => {
    campaignManager.storeCampaigns(scaled, {}, () => {
      campaignManager.checkTriggers("tv.event_simple", {}, impressionHandler, true);

      const iamItem = document.getElementsByTagName("swrve-in-app-message")[0] as HTMLSwrveInAppElement;
      expect(iamItem.shadowRoot?.getElementById("swrveIAM__button-0")).not.toBeNull();
      
      const button1 = iamItem.shadowRoot?.getElementById("swrveIAM__button-0") as HTMLImageElement;

      if (button1) {
        const originalSize = 80;
        expect(button1).not.toBeNull();
        expect(button1.width).toEqual(originalSize * 1.5);
      } else {
        fail("Button was not created.");
      }
    });
  });

  it("switches pages when a PAGE_LINK button is clicked", () => {
    const genericCampaignEventCallback = jest.fn();
    const dataCaptureEventCallback = jest.fn();
    campaignManager.onGenericCampaignEvent(genericCampaignEventCallback);
    campaignManager.onDataCaptureEvent(dataCaptureEventCallback);

    campaignManager.showCampaign(multipageCampaign);

    const iamItems = document.getElementsByTagName("swrve-in-app-message");
    const iamItem = iamItems[iamItems.length - 1] as HTMLSwrveInAppElement;
    const firstPageButton = (iamItem as any)._canvasElement.querySelector("#swrveIAM__button-0") as HTMLElement;
    expect(firstPageButton).not.toBeNull();
    expect(genericCampaignEventCallback.mock.calls[0][0]).toEqual({
      campaignType: "iam",
      actionType: "page_view",
      id: 740417,
      contextId: 1,
      payload: {
        pageName: "first",
      },
    });

    firstPageButton.click();

    expect((iamItem as any)._canvasElement.querySelector("#swrveIAM__image-0")).not.toBeNull();
    expect((iamItem as any)._canvasElement.querySelector("#swrveIAM__button-0")).toBeNull();
    expect(genericCampaignEventCallback.mock.calls[1][0]).toEqual({
      campaignType: "iam",
      actionType: "navigation",
      id: 740417,
      contextId: 1,
      payload: {
        pageName: "first",
        to: 2,
        buttonId: 1,
        buttonName: "Next",
      },
    });
    expect(genericCampaignEventCallback.mock.calls[2][0]).toEqual({
      campaignType: "iam",
      actionType: "page_view",
      id: 740417,
      contextId: 2,
      payload: {
        pageName: "second",
      },
    });
    expect(dataCaptureEventCallback.mock.calls[0][0]).toEqual({
      events: [
        {
          name: "bw.test",
          payload: [
            { key: "prop 1", value: "value is ${user.name}" },
          ],
        },
      ],
      user_updates: [
        { key: "user.update", value: "update is ${user.name}" },
      ],
      personalizationProperties: undefined,
    });
  });

  it("dispatches data capture before closing on DISMISS button click", () => {
    const dataCaptureEventCallback = jest.fn();
    campaignManager.onDataCaptureEvent(dataCaptureEventCallback);
    const dismissCampaign = JSON.parse(JSON.stringify(multipageCampaign));
    const dismissButton =
      dismissCampaign.message.template.formats[0].pages[0].buttons[0];
    dismissButton.type = { type: "text", value: "DISMISS" };
    dismissButton.action = { type: "text", value: "" };

    campaignManager.showCampaign(dismissCampaign);

    const iamItems = document.getElementsByTagName("swrve-in-app-message");
    const iamItem = iamItems[iamItems.length - 1] as HTMLSwrveInAppElement;
    const dismissButtonElement = (iamItem as any)._canvasElement.querySelector("#swrveIAM__button-0") as HTMLElement;
    expect(dismissButtonElement).not.toBeNull();

    dismissButtonElement.click();

    expect(dataCaptureEventCallback).toHaveBeenCalledTimes(1);
    expect(dataCaptureEventCallback.mock.calls[0][0]).toEqual({
      events: [
        {
          name: "bw.test",
          payload: [
            { key: "prop 1", value: "value is ${user.name}" },
          ],
        },
      ],
      user_updates: [
        { key: "user.update", value: "update is ${user.name}" },
      ],
      personalizationProperties: undefined,
    });
  });

  it("orders IAM page elements by iam_z_index", () => {
    campaignManager.showCampaign(zIndexCampaign);

    const iamItems = document.getElementsByTagName("swrve-in-app-message");
    const iamItem = iamItems[iamItems.length - 1] as HTMLSwrveInAppElement;
    const children = Array.from(
      (iamItem as any)._canvasElement.children as HTMLCollectionOf<Element>
    ).map(
      (element: Element) => element.id
    );

    expect(children).toEqual([
      "swrveIAM__image-1",
      "swrveIAM__button-1",
      "swrveIAM__image-0",
      "swrveIAM__button-0",
    ]);

    const zIndexes = Array.from(
      (iamItem as any)._canvasElement.children as HTMLCollectionOf<HTMLElement>
    ).map(
      (element: HTMLElement) => element.style.zIndex
    );

    expect(zIndexes).toEqual(["0", "1", "2", "3"]);
  });

  it("renders video image and dispatches video generic campaign events once per page", () => {
    const genericCampaignEventCallback = jest.fn();
    campaignManager.onGenericCampaignEvent(genericCampaignEventCallback);

    campaignManager.showCampaign(videoCampaign);

    const iamItems = document.getElementsByTagName("swrve-in-app-message");
    const iamItem = iamItems[iamItems.length - 1] as HTMLSwrveInAppElement;
    const videoImage = (iamItem as any)._canvasElement.querySelector("#swrveIAM__image-1") as any;
    expect(videoImage).not.toBeNull();
    expect(videoImage.style.top).toBe("0px");
    expect(videoImage.style.left).toBe("0px");
    expect(videoImage.style.width).toBe("320px");
    expect(videoImage.style.height).toBe("180px");

    videoImage.onVideoEvent("video_started", 42);
    videoImage.onVideoEvent("video_started", 42);
    videoImage.onVideoEvent("video_ended", 42);
    videoImage.onVideoEvent("video_ended", 42);

    expect(genericCampaignEventCallback.mock.calls[0][0]).toEqual({
      campaignType: "iam",
      actionType: "page_view",
      id: 740419,
      contextId: 10,
      payload: {
        pageName: "video-page",
      },
    });
    expect(genericCampaignEventCallback.mock.calls[1][0]).toEqual({
      campaignType: "iam",
      actionType: "video_started",
      id: 740419,
      contextId: 10,
      mediaId: 42,
      payload: {
        pageName: "video-page",
      },
    });
    expect(genericCampaignEventCallback.mock.calls[2][0]).toEqual({
      campaignType: "iam",
      actionType: "video_ended",
      id: 740419,
      contextId: 10,
      mediaId: 42,
      payload: {
        pageName: "video-page",
      },
    });
    expect(genericCampaignEventCallback.mock.calls.length).toBe(3);
  });

  it("renders story controls, advances pages, and dismisses on last page progression", () => {
    const genericCampaignEventCallback = jest.fn();
    campaignManager.onGenericCampaignEvent(genericCampaignEventCallback);

    campaignManager.showCampaign(storyCampaign);

    const iamItems = document.getElementsByTagName("swrve-in-app-message");
    const iamItem = iamItems[iamItems.length - 1] as HTMLSwrveInAppElement;
    const progress = (iamItem as any)._canvasElement.querySelector(".swrveIAM__story-progress") as HTMLElement;
    const dismissButton = (iamItem as any)._canvasElement.querySelector(".swrveIAM__story-dismiss-button") as HTMLButtonElement;

    expect(progress).not.toBeNull();
    expect(progress.style.top).toBe("10px");
    expect(progress.style.left).toBe("12px");
    expect(progress.style.right).toBe("12px");
    expect(progress.style.height).toBe("4px");
    expect(progress.children.length).toBe(2);
    expect(dismissButton).not.toBeNull();
    expect(dismissButton.style.top).toBe("22px");
    expect(dismissButton.style.right).toBe("12px");
    expect(dismissButton.style.width).toBe("24px");
    expect(dismissButton.getAttribute("aria-label")).toBe("Close story");

    expect(genericCampaignEventCallback.mock.calls[0][0]).toEqual({
      campaignType: "iam",
      actionType: "page_view",
      id: 740420,
      contextId: 1,
      payload: {
        pageName: "story-one",
      },
    });

    (iamItem as any).handleStorySegmentFinished();

    expect((iamItem as any)._canvasElement.querySelector("#swrveIAM__image-0")).not.toBeNull();
    expect(genericCampaignEventCallback.mock.calls[1][0]).toEqual({
      campaignType: "iam",
      actionType: "page_view",
      id: 740420,
      contextId: 2,
      payload: {
        pageName: "story-two",
      },
    });

    (iamItem as any).handleStorySegmentFinished();

    expect(genericCampaignEventCallback.mock.calls[2][0]).toEqual({
      campaignType: "iam",
      actionType: "dismiss",
      id: 740420,
      contextId: 2,
      payload: {
        pageName: "story-two",
        buttonName: "Story Complete",
        buttonId: 99,
      },
    });
    expect((iamItem as any)._overlayElement.style.display).toBe("none");
  });

  it("dispatches story dismiss button click events", () => {
    const genericCampaignEventCallback = jest.fn();
    const buttonClickCallback = jest.fn();
    campaignManager.onGenericCampaignEvent(genericCampaignEventCallback);
    campaignManager.onButtonClicked(buttonClickCallback);

    campaignManager.showCampaign(storyCampaign);

    const iamItems = document.getElementsByTagName("swrve-in-app-message");
    const iamItem = iamItems[iamItems.length - 1] as HTMLSwrveInAppElement;
    const dismissButton = (iamItem as any)._canvasElement.querySelector(".swrveIAM__story-dismiss-button") as HTMLButtonElement;
    dismissButton.click();

    expect(genericCampaignEventCallback.mock.calls[1][0]).toEqual({
      campaignType: "iam",
      actionType: "dismiss",
      id: 740420,
      contextId: 1,
      payload: {
        pageName: "story-one",
        buttonName: "Story Dismiss",
        buttonId: 88,
      },
    });
    expect(buttonClickCallback.mock.calls[0][0].name).toBe("Story Dismiss");
    expect(buttonClickCallback.mock.calls[0][0].type.value).toBe("DISMISS");
    expect(buttonClickCallback.mock.calls[0][1].id).toBe(740420);
  });

  it("switches to the portrait format when the viewport becomes portrait", (done) => {
    resizeViewportTo(1024, 768);
    campaignManager.showCampaign(twoFormatCampaign);

    const iamItems = document.getElementsByTagName("swrve-in-app-message");
    const iamItem = iamItems[iamItems.length - 1] as HTMLSwrveInAppElement;
    expect((iamItem as any).message.canvasWidth).toBe(320);
    expect((iamItem as any).message.canvasHeight).toBe(180);

    resizeViewportTo(400, 800);

    setTimeout(() => {
      expect((iamItem as any).message.canvasWidth).toBe(180);
      expect((iamItem as any).message.canvasHeight).toBe(320);
      resizeViewportTo(1024, 768);
      done();
    }, AFTER_RESIZE_DEBOUNCE_MS);
  });

  it("keeps the current page when the format switches", (done) => {
    resizeViewportTo(1024, 768);
    campaignManager.showCampaign(twoFormatCampaign);

    const iamItems = document.getElementsByTagName("swrve-in-app-message");
    const iamItem = iamItems[iamItems.length - 1] as HTMLSwrveInAppElement;

    /* Navigate to page 2 before rotating. */
    const nextButton = (iamItem as any)._canvasElement.querySelector("#swrveIAM__button-0") as HTMLElement;
    nextButton.click();
    expect((iamItem as any)._canvasElement.querySelector("#swrveIAM__image-0")).not.toBeNull();

    resizeViewportTo(400, 800);

    setTimeout(() => {
      /* Still the portrait format... */
      expect((iamItem as any).message.canvasWidth).toBe(180);
      /* ...and still page 2, which has an image and no buttons. */
      expect((iamItem as any)._canvasElement.querySelector("#swrveIAM__image-0")).not.toBeNull();
      expect((iamItem as any)._canvasElement.querySelector("#swrveIAM__button-0")).toBeNull();
      resizeViewportTo(1024, 768);
      done();
    }, AFTER_RESIZE_DEBOUNCE_MS);
  });

  it("does not re-send page_view for the current page after a format switch", (done) => {
    const genericCampaignEventCallback = jest.fn();
    campaignManager.onGenericCampaignEvent(genericCampaignEventCallback);

    resizeViewportTo(1024, 768);
    campaignManager.showCampaign(twoFormatCampaign);

    const pageViewsFor = (pageId: number): number =>
      genericCampaignEventCallback.mock.calls.filter(
        (call) => call[0].actionType === "page_view" && call[0].contextId === pageId
      ).length;

    expect(pageViewsFor(1)).toBe(1);

    resizeViewportTo(400, 800);

    setTimeout(() => {
      expect((iamItemMessage() as any).canvasWidth).toBe(180);
      expect(pageViewsFor(1)).toBe(1);
      resizeViewportTo(1024, 768);
      done();
    }, AFTER_RESIZE_DEBOUNCE_MS);
  });

  it("does not switch format for a message with a single format", (done) => {
    resizeViewportTo(400, 800);
    campaignManager.showCampaign(portraitOnlyCampaign);

    const iamItems = document.getElementsByTagName("swrve-in-app-message");
    const iamItem = iamItems[iamItems.length - 1] as HTMLSwrveInAppElement;
    expect((iamItem as any).message.canvasWidth).toBe(200);

    resizeViewportTo(1024, 768);

    setTimeout(() => {
      expect((iamItem as any).message.canvasWidth).toBe(200);
      expect((iamItem as any).message.canvasHeight).toBe(300);
      done();
    }, AFTER_RESIZE_DEBOUNCE_MS);
  });

  it("does not re-render when a resize keeps the same orientation", (done) => {
    const genericCampaignEventCallback = jest.fn();
    campaignManager.onGenericCampaignEvent(genericCampaignEventCallback);

    resizeViewportTo(1024, 768);
    campaignManager.showCampaign(twoFormatCampaign);

    const iamItems = document.getElementsByTagName("swrve-in-app-message");
    const iamItem = iamItems[iamItems.length - 1] as HTMLSwrveInAppElement;
    const messageBefore = (iamItem as any).message;

    resizeViewportTo(1280, 720);

    setTimeout(() => {
      /* Same format object, so no swap happened. */
      expect((iamItem as any).message).toBe(messageBefore);
      expect((iamItem as any).message.canvasWidth).toBe(320);
      resizeViewportTo(1024, 768);
      done();
    }, AFTER_RESIZE_DEBOUNCE_MS);
  });
});

function iamItemMessage(): unknown {
  const iamItems = document.getElementsByTagName("swrve-in-app-message");
  return (iamItems[iamItems.length - 1] as any).message;
}
