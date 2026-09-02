import { ISwrveButton, ISwrveImage } from "../src/interfaces/ISwrveCampaign";
import { SwrveButton } from "../src/Campaigns/Messages/UIElements/SwrveButton";
import { SwrveImage } from "../src/Campaigns/Messages/UIElements/SwrveImage";

// globally used standard button
var interfaceButton = {
  name: "Background",
  x: { type: "number", value: 200 },
  y: { type: "number", value: 300 },
  w: { type: "number", value: 100 },
  h: { type: "number", value: 140 },
  image_width: 110,
  image_height: 220,
  image_filename: "testImg.png",
  type: { type: "text", value: "DISMISS" },
  action: { type: "text", value: "" },
  game_id: { type: "number", value: "" },
  image_up: { type: "asset", value: "assetID" },
} as ISwrveButton;

// globally used standard image
var interfaceImage = {
  color: { type: "color", value: "FFFFFF" },
  image: { type: "asset", value: "assetID" },
  image_filename: "testImg.png",
  image_width: 110,
  image_height: 220,
  name: "Background",
  x: { type: "number", value: 200 },
  y: { type: "number", value: 300 },
  w: { type: "number", value: 100 },
  h: { type: "number", value: 140 },
} as ISwrveImage;

describe("SwrveButton", () => {
  it("Parses and returns a basic button correctly", () => {
    const testButton = interfaceButton;

    const button = new SwrveButton(testButton, "https://test.cdn/");

    expect(button.getAssetID()).toBe("assetID");
    expect(button.getHeight()).toBe(220);
    expect(button.getWidth()).toBe(110);
    expect(button.isSingleLineText).toBe(false);
    expect(button.hasDynamicUrl).toBe(false);
    expect(button.getAssetPath()).toBe("https://test.cdn/assetID");
    expect(button.canRender()).toBe(true);
  });

  it("Parses and returns a button with text correctly", () => {
    const testButton = {
      ...interfaceButton,
      text: { type: "string", value: "Single Line Text" },
    } as ISwrveButton;

    const button = new SwrveButton(testButton, "https://test.cdn/");

    expect(button.isSingleLineText).toBe(true);
    expect(button.getWidth()).toBe(110);
    expect(button.getHeight()).toBe(220);
    expect(button.canRender()).toBe(true);
  });

  it("canRender returns true for a themed text button without an image asset", () => {
    const testButton = {
      ...interfaceButton,
      image_up: undefined,
      dynamic_image_url: undefined,
      text: { type: "text", value: "Custom Button" },
      theme: {
        font_size: 10,
        font_color: "#FFFFFFFF",
        bg_color: "#FF0040DD",
        corner_radius: 28,
        pressed_state: {
          font_color: "#FFFFFFFF",
          bg_color: "#FF002787",
        },
      },
    } as ISwrveButton;

    const button = new SwrveButton(testButton, "https://test.cdn/");

    expect(button.isThemed).toBe(true);
    expect(button.getWidth()).toBe(100);
    expect(button.getHeight()).toBe(140);
    expect(button.canRender()).toBe(true);
  });

  it("Parses and returns a dynamic image url with no personalization", () => {
    let testButton = interfaceButton;
    testButton.dynamic_image_url = "https://dynamic_image_url_test.png";

    const button = new SwrveButton(testButton, "https://test.cdn/");

    expect(button.hasDynamicUrl).toBe(true);
    expect(button.getAssetPath()).toBe("https://dynamic_image_url_test.png");
    expect(button.canRender()).toBe(true);
  });

  it("Parses and returns a dynamic gif url", () => {
    const testButton = {
      ...interfaceButton,
      dynamic_image_url: "https://dynamic_image_url_test.gif",
      media_format: "gif",
    } as ISwrveButton;

    const button = new SwrveButton(testButton, "https://test.cdn/");

    expect(button.hasDynamicUrl).toBe(true);
    expect(button.getAssetID()).toBe("https://dynamic_image_url_test.gif");
    expect(button.getAssetPath()).toBe("https://dynamic_image_url_test.gif");
    expect(button.canRender()).toBe(true);
  });

  it("Parses and returns a static gif button asset", () => {
    const testButton = {
      ...interfaceButton,
      image_up: { type: "asset", value: "assetID.gif" },
      dynamic_image_url: undefined,
      text: undefined,
      media_format: "gif",
    } as ISwrveButton;

    const button = new SwrveButton(testButton, "https://test.cdn/");

    expect(button.hasDynamicUrl).toBe(false);
    expect(button.getAssetID()).toBe("assetID.gif");
    expect(button.getAssetPath()).toBe("https://test.cdn/assetID.gif");
    expect(button.canRender()).toBe(true);
  });

  it("Parses and returns fallback url because url didn't resolve personalization", () => {
    let testButton = interfaceButton;
    testButton.dynamic_image_url =
      "https://dynamic_image_url_test/${personalization}.png";

    const button = new SwrveButton(testButton, "https://test.cdn/");

    expect(button.hasDynamicUrl).toBe(true);
    expect(button.getAssetPath()).toBe("https://test.cdn/assetID");
    expect(button.canRender()).toBe(true);
  });

  it("Parses and returns fallback url because url didn't resolve personalization", () => {
    let testButton = interfaceButton;
    testButton.dynamic_image_url =
      "https://dynamic_image_url_test/${personalization}.png";

    const button = new SwrveButton(testButton, "https://test.cdn/", {
      personalization: "hello",
    });

    expect(button.hasDynamicUrl).toBe(true);
    expect(button.getAssetPath()).toBe(
      "https://dynamic_image_url_test/hello.png"
    );
    expect(button.canRender()).toBe(true);
  });

  it("canRender returns false when the asset cannot be resolved", () => {
    let testButton = interfaceButton;
    testButton.dynamic_image_url =
      "https://dynamic_image_url_test/${personalization}.png";
    testButton.image_up = undefined;
    testButton.text = undefined;

    const button = new SwrveButton(testButton, "https://test.cdn/", {});
    expect(button.canRender()).toBe(false);
  });

  it("canRender returns false if there's text but it cannot be resolved", () => {
    let testButton = interfaceButton;
    testButton.dynamic_image_url =
      "https://dynamic_image_url_test/${personalization}.png";
    testButton.text = { type: "text", value: "text ${not_personalization}" };

    const button = new SwrveButton(testButton, "https://test.cdn/", {
      personalization: "not_the_right_one",
    });
    expect(button.canRender()).toBe(false);
  });

  it("canRender returns false when a custom action cannot be personalized", () => {
    const testButton = {
      ...interfaceButton,
      text: undefined,
      dynamic_image_url: undefined,
      image_up: { type: "asset", value: "assetID" },
      type: { type: "text", value: "CUSTOM" },
      action: {
        type: "text",
        value: "https://shop.example.com/user/${user.id}/cart",
      },
    } as ISwrveButton;

    const button = new SwrveButton(testButton, "https://test.cdn/", {});

    expect(button.canRender()).toBe(false);
  });

  it("canRender returns true when a custom action personalization resolves", () => {
    const testButton = {
      ...interfaceButton,
      text: undefined,
      dynamic_image_url: undefined,
      image_up: { type: "asset", value: "assetID" },
      type: { type: "text", value: "CUSTOM" },
      action: {
        type: "text",
        value: "https://shop.example.com/user/${user.id}/cart",
      },
    } as ISwrveButton;

    const button = new SwrveButton(testButton, "https://test.cdn/", {
      "user.id": "12345",
    });

    expect(button.canRender()).toBe(true);
  });

  it("canRender returns true when a custom action personalization falls back", () => {
    const testButton = {
      ...interfaceButton,
      text: undefined,
      dynamic_image_url: undefined,
      image_up: { type: "asset", value: "assetID" },
      type: { type: "text", value: "CUSTOM" },
      action: {
        type: "text",
        value: 'https://shop.example.com/user/${user.id|fallback="me"}/cart',
      },
    } as ISwrveButton;

    const button = new SwrveButton(testButton, "https://test.cdn/", {});

    expect(button.canRender()).toBe(true);
  });

  it("canRender validates the custom action on a themed text button", () => {
    const testButton = {
      ...interfaceButton,
      dynamic_image_url: undefined,
      image_up: undefined,
      text: { type: "text", value: "Shop now" },
      theme: {
        font_size: { type: "number", value: 20 },
        h_align: { type: "text", value: "center" },
      },
      type: { type: "text", value: "CUSTOM" },
      action: {
        type: "text",
        value: "https://shop.example.com/user/${user.id}/cart",
      },
    } as unknown as ISwrveButton;

    const button = new SwrveButton(testButton, "https://test.cdn/", {});

    expect(button.isThemed).toBe(true);
    expect(button.canRender()).toBe(false);
  });

  it("canRender ignores unresolved personalization in a non-custom action", () => {
    const testButton = {
      ...interfaceButton,
      text: undefined,
      dynamic_image_url: undefined,
      image_up: { type: "asset", value: "assetID" },
      type: { type: "text", value: "PAGE_LINK" },
      action: { type: "text", value: "${page.id}" },
    } as ISwrveButton;

    const button = new SwrveButton(testButton, "https://test.cdn/", {});

    expect(button.canRender()).toBe(true);
  });
});

describe("SwrveImage", () => {
  it("Parses and returns a basic button correctly", () => {
    const testImage = interfaceImage;

    const image = new SwrveImage(testImage, "https://test.cdn/");

    expect(image.getAssetID()).toBe("assetID");
    expect(image.getHeight()).toBe(220);
    expect(image.getWidth()).toBe(110);
    expect(image.isSingleLineText).toBe(false);
    expect(image.hasDynamicUrl).toBe(false);
    expect(image.getAssetPath()).toBe("https://test.cdn/assetID");
    expect(image.canRender()).toBe(true);
  });

  it("Parses and returns a image with text correctly", () => {
    const testImage = {
      ...interfaceImage,
      text: { type: "string", value: "Single Line Text" },
    } as ISwrveImage;

    const image = new SwrveImage(testImage, "https://test.cdn/");

    expect(image.isSingleLineText).toBe(true);
    expect(image.getWidth()).toBe(110);
    expect(image.getHeight()).toBe(220);
    expect(image.canRender()).toBe(true);
  });

  it("canRender returns true for multiline text without an image asset", () => {
    const testImage = {
      ...interfaceImage,
      image: undefined,
      dynamic_image_url: undefined,
      text: undefined,
      multiline_text: {
        value: "This is multiline text",
        font_size: 16,
        scrollable: false,
      },
    } as ISwrveImage;

    const image = new SwrveImage(testImage, "https://test.cdn/");

    expect(image.isMultiLineText).toBe(true);
    expect(image.getWidth()).toBe(100);
    expect(image.getHeight()).toBe(140);
    expect(image.canRender()).toBe(true);
  });

  it("canRender returns false for multiline text that cannot be personalized", () => {
    const testImage = {
      ...interfaceImage,
      image: undefined,
      dynamic_image_url: undefined,
      text: undefined,
      multiline_text: {
        value: "This is multiline text ${missing_property}",
        font_size: 16,
        scrollable: false,
      },
    } as ISwrveImage;

    const image = new SwrveImage(testImage, "https://test.cdn/", {
      available_property: "value",
    });

    expect(image.canRender()).toBe(false);
  });

  it("Parses and returns a dynamic image url with no personalization", () => {
    let testImage = interfaceImage;
    testImage.dynamic_image_url = "https://dynamic_image_url_test.png";

    const image = new SwrveImage(testImage, "https://test.cdn/");

    expect(image.hasDynamicUrl).toBe(true);
    expect(image.getAssetPath()).toBe("https://dynamic_image_url_test.png");
    expect(image.getAssetID()).toBe("https://dynamic_image_url_test.png");
    expect(image.canRender()).toBe(true);
  });

  it("Parses and returns a dynamic gif url", () => {
    const testImage = {
      ...interfaceImage,
      dynamic_image_url: "https://dynamic_image_url_test.gif",
      media_format: "gif",
    } as ISwrveImage;

    const image = new SwrveImage(testImage, "https://test.cdn/");

    expect(image.hasDynamicUrl).toBe(true);
    expect(image.getAssetPath()).toBe("https://dynamic_image_url_test.gif");
    expect(image.getAssetID()).toBe("https://dynamic_image_url_test.gif");
    expect(image.canRender()).toBe(true);
  });

  it("Parses and returns a video image", () => {
    const testImage = {
      ...interfaceImage,
      dynamic_image_url: "https://dynamic_image_url_test.mp4",
      media_format: "mp4",
      video_settings: {
        auto_play: true,
        loop: false,
        fill_screen: false,
        show_controls: true,
      },
      media_id: 42,
    } as ISwrveImage;

    const image = new SwrveImage(testImage, "https://test.cdn/");

    expect(image.isVideo).toBe(true);
    expect(image.getWidth()).toBe(100);
    expect(image.getHeight()).toBe(140);
    expect(image.getAssetPath()).toBe("https://dynamic_image_url_test.mp4");
    expect(image.getAssetID()).toBe("https://dynamic_image_url_test.mp4");
    expect(image.canRender()).toBe(true);
  });

  it("Parses and returns a static gif image asset", () => {
    const testImage = {
      ...interfaceImage,
      image: { type: "asset", value: "assetID.gif" },
      dynamic_image_url: undefined,
      text: undefined,
      media_format: "gif",
    } as ISwrveImage;

    const image = new SwrveImage(testImage, "https://test.cdn/");

    expect(image.hasDynamicUrl).toBe(false);
    expect(image.getAssetID()).toBe("assetID.gif");
    expect(image.getAssetPath()).toBe("https://test.cdn/assetID.gif");
    expect(image.canRender()).toBe(true);
  });

  it("Parses and returns fallback url because url didn't resolve personalization", () => {
    let testImage = interfaceImage;
    testImage.dynamic_image_url =
      "https://dynamic_image_url_test/${personalization}.png";

    const image = new SwrveImage(testImage, "https://test.cdn/");

    expect(image.hasDynamicUrl).toBe(true);
    expect(image.getAssetPath()).toBe("https://test.cdn/assetID");
    expect(image.canRender()).toBe(true);
  });

  it("Parses and returns fallback url because url didn't resolve personalization", () => {
    let testImage = interfaceImage;
    testImage.dynamic_image_url =
      "https://dynamic_image_url_test/${personalization}.png";

    const image = new SwrveImage(testImage, "https://test.cdn/", {
      personalization: "hello",
    });

    expect(image.hasDynamicUrl).toBe(true);
    expect(image.getAssetPath()).toBe(
      "https://dynamic_image_url_test/hello.png"
    );
    expect(image.canRender()).toBe(true);
  });

  it("canRender returns false when the asset cannot be resolved", () => {
    let testImage = interfaceImage;
    testImage.dynamic_image_url =
      "https://dynamic_image_url_test/${personalization}.png";
    testImage.image = undefined;
    testImage.text = undefined;

    const image = new SwrveImage(testImage, "https://test.cdn/", {});
    expect(image.canRender()).toBe(false);
  });

  it("canRender returns false if there's text but it cannot be resolved", () => {
    let testImage = interfaceImage;
    testImage.dynamic_image_url =
      "https://dynamic_image_url_test/${personalization}.png";
    testImage.text = { type: "text", value: "text ${not_personalization}" };

    const image = new SwrveImage(testImage, "https://test.cdn/", {
      personalization: "not_the_right_one",
    });
    expect(image.canRender()).toBe(false);
  });
});
