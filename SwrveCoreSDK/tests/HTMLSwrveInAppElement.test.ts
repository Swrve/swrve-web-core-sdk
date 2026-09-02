import "@webcomponents/custom-elements/src/native-shim";
import HTMLSwrveInAppElement, {
  computeCanvasScaleTransform,
  ISwrveInAppMessageFormat,
} from "../src/Campaigns/Messages/HTMLSwrveInAppElement";
import { ISwrveInAppMessage } from "../src/interfaces/ISwrveCampaign";
import { ISwrveInAppMessageConfig } from "../src/interfaces/ISwrveConfig";

describe("computeCanvasScaleTransform", () => {
  it("scales the canvas down to fit the viewport", () => {
    expect(
      computeCanvasScaleTransform(400, 800, { width: 200, height: 800 })
    ).toBe("scale(0.5)");
  });

  it("fits to the smaller ratio (height-constrained portrait in a wide viewport)", () => {
    // portrait canvas 1152x2048 in a wide, short viewport -> height wins
    expect(
      computeCanvasScaleTransform(1152, 2048, { width: 1221, height: 659 })
    ).toBe("scale(" + Math.min(1221 / 1152, 659 / 2048, 1) + ")");
  });

  it("never scales above 1 (no upscaling on large viewports)", () => {
    expect(
      computeCanvasScaleTransform(200, 300, { width: 1000, height: 1000 })
    ).toBe("scale(1)");
  });

  it("returns null when the canvas has no size", () => {
    expect(
      computeCanvasScaleTransform(0, 0, { width: 400, height: 800 })
    ).toBeNull();
  });
});

if (!window.customElements.get("swrve-in-app-message")) {
  window.customElements.define("swrve-in-app-message", HTMLSwrveInAppElement);
}

/** A message with no elements on its single page, so only the canvas renders. */
const emptyMessage = (color?: string): ISwrveInAppMessage =>
  ({
    message: { id: 1, name: "colour-test" },
    parentCampaign: { id: 2 },
    imagesCDN: "https://test.cdn/",
    canvasWidth: 200,
    canvasHeight: 300,
    scale: 1,
    color,
    images: [],
    buttons: [],
    pages: [{ page_id: 0, images: [], buttons: [] }],
  } as any);

const showMessage = (
  message: ISwrveInAppMessage,
  inAppConfig?: ISwrveInAppMessageConfig
): HTMLSwrveInAppElement => {
  const element = document.createElement(
    "swrve-in-app-message"
  ) as HTMLSwrveInAppElement;
  element.inAppConfig = inAppConfig;
  document.body.appendChild(element);
  element.message = message;
  element.show();

  return element;
};

const overlayOf = (element: HTMLSwrveInAppElement): HTMLElement =>
  (element as any)._overlayElement;

const canvasOf = (element: HTMLSwrveInAppElement): HTMLElement =>
  (element as any)._canvasElement;

describe("in-app message background colours", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("uses the configured default when the campaign format has no colour", () => {
    const element = showMessage(emptyMessage(), {
      autoShowMessagesMaxDelay: 0,
      defaultBackgroundColor: "rgb(1, 2, 3)",
    });

    expect(overlayOf(element).style.backgroundColor).toBe("rgb(1, 2, 3)");
  });

  it("uses the campaign format colour ahead of the configured default", () => {
    const element = showMessage(emptyMessage("#FF040506"), {
      autoShowMessagesMaxDelay: 0,
      defaultBackgroundColor: "rgb(1, 2, 3)",
    });

    expect(overlayOf(element).style.backgroundColor).toBe("rgb(4, 5, 6)");
  });

  it("uses the campaign format colour when nothing is configured", () => {
    const element = showMessage(emptyMessage("#FF040506"));

    expect(overlayOf(element).style.backgroundColor).toBe("rgb(4, 5, 6)");
  });

  it("leaves the stylesheet backdrop in place when neither is set", () => {
    const element = showMessage(emptyMessage());

    expect(overlayOf(element).style.backgroundColor).toBe("");
  });

  it("never paints the canvas itself, only the area behind the message", () => {
    const element = showMessage(emptyMessage("#FF040506"), {
      autoShowMessagesMaxDelay: 0,
      defaultBackgroundColor: "rgb(1, 2, 3)",
    });

    expect(canvasOf(element).style.backgroundColor).toBe("");
  });

  it("reverts to the configured default when a format without a colour is swapped in", () => {
    const element = showMessage(emptyMessage("#FF040506"), {
      autoShowMessagesMaxDelay: 0,
      defaultBackgroundColor: "rgb(1, 2, 3)",
    });

    element.swapFormat({
      scale: 1,
      images: [],
      buttons: [],
      pages: [{ page_id: 0, images: [], buttons: [] }],
      canvasWidth: 300,
      canvasHeight: 200,
    } as unknown as ISwrveInAppMessageFormat);

    expect(overlayOf(element).style.backgroundColor).toBe("rgb(1, 2, 3)");
  });
});
