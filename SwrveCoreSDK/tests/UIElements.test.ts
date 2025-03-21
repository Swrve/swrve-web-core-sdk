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
    let testButton = interfaceButton;
    testButton.text = { type: "string", value: "Single Line Text" };

    const button = new SwrveButton(testButton, "https://test.cdn/");

    expect(button.isSingleLineText).toBe(true);
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
    let testImage = interfaceImage;
    testImage.text = { type: "string", value: "Single Line Text" };

    const image = new SwrveImage(testImage, "https://test.cdn/");

    expect(image.isSingleLineText).toBe(true);
    expect(image.canRender()).toBe(true);
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
