import "@webcomponents/custom-elements/src/native-shim";
import HTMLSwrveButtonElement from "../src/Campaigns/Messages/HTMLSwrveButtonElement";
import { SwrveButton } from "../src/Campaigns/Messages/UIElements/SwrveButton";
import { ISwrveButton, ISwrveButtonTheme } from "../src/interfaces/ISwrveCampaign";
import { ISwrveInAppMessageConfig } from "../src/interfaces/ISwrveConfig";

if (!window.customElements.get("swrve-button")) {
  window.customElements.define("swrve-button", HTMLSwrveButtonElement);
}

/* jsdom has no 2D canvas context, and the text button path measures text to fit
 * its font size. Without this stub the render throws inside connectedCallback
 * and no button styles are produced at all. */
beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
    font: "",
    measureText: () => ({
      width: 50,
      actualBoundingBoxAscent: 10,
      actualBoundingBoxDescent: 2,
    }),
  }) as any;
});

const baseButton = {
  name: "Button",
  x: { type: "number", value: 0 },
  y: { type: "number", value: 0 },
  w: { type: "number", value: 100 },
  h: { type: "number", value: 40 },
  image_width: 100,
  image_height: 40,
  image_filename: "button.png",
  type: { type: "text", value: "DISMISS" },
  action: { type: "text", value: "" },
  game_id: { type: "number", value: "" },
  image_up: { type: "asset", value: "assetID" },
} as ISwrveButton;

const textButton = (theme?: ISwrveButtonTheme): ISwrveButton =>
  ({
    ...baseButton,
    text: { type: "string", value: "Click me" },
    theme,
  } as ISwrveButton);

const renderButton = (
  button: ISwrveButton,
  inAppConfig?: ISwrveInAppMessageConfig
): string => {
  const element = document.createElement("swrve-button") as HTMLSwrveButtonElement;
  element.button = new SwrveButton(button, "https://test.cdn/");
  element.canvasWidth = 400;
  element.canvasHeight = 600;
  element.inAppConfig = inAppConfig;
  document.body.appendChild(element);

  return (element as any)._$styles.textContent as string;
};

const withFocusStyle = (
  style: ISwrveInAppMessageConfig["defaultButtonFocusStyle"]
): ISwrveInAppMessageConfig => ({
  autoShowMessagesMaxDelay: 0,
  defaultButtonFocusStyle: style,
});

describe("campaign themed button states", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  const themeWithStates: ISwrveButtonTheme = {
    bg_color: "#FFC4C4C4",
    font_color: "#FF000000",
    pressed_state: { font_color: "#FFE64C15", bg_color: "#FFAAAAAA" },
    focused_state: { font_color: "#FFFFFFFF", bg_color: "#FF002787" },
  };

  const themePressedOnly: ISwrveButtonTheme = {
    bg_color: "#FFC4C4C4",
    font_color: "#FF000000",
    pressed_state: { font_color: "#FFE64C15", bg_color: "#FFAAAAAA" },
  };

  it("applies the focused state on pointer hover, matching remote focus on TV", () => {
    const styles = renderButton(textButton(themeWithStates));

    expect(styles).toMatch(
      /button:hover\s*{[^}]*background-color:\s*rgba\(0, 39, 135, 1\)/
    );
    expect(styles).toMatch(
      /button:focus\s*{[^}]*background-color:\s*rgba\(0, 39, 135, 1\)/
    );
  });

  it("falls back to the base theme on hover when the campaign has no focused state", () => {
    const styles = renderButton(textButton(themePressedOnly));
    const hoverRule = styles.match(/button:hover\s*{[^}]*}/)![0];

    expect(hoverRule).toContain("background-color: rgba(196, 196, 196, 1)");
    expect(hoverRule).not.toContain("rgba(170, 170, 170, 1)");
  });

  it("keeps the Android pressed-state fallback for keyboard and remote focus", () => {
    const styles = renderButton(textButton(themePressedOnly));

    expect(styles).toMatch(
      /button:focus\s*{[^}]*background-color:\s*rgba\(170, 170, 170, 1\)/
    );
  });

  it("orders the hover rule after the focus rule, so hovering never shows the pressed fallback", () => {
    const styles = renderButton(textButton(themePressedOnly));

    /* The focus rule carries the pressed colour for this theme; the hover rule
     * is the last place the base theme colour appears. Hover must come second so
     * that it wins for a button that is both hovered and focused. */
    const focusAt = styles.indexOf("rgba(170, 170, 170, 1)");
    const hoverAt = styles.lastIndexOf("rgba(196, 196, 196, 1)");

    expect(focusAt).toBeGreaterThan(-1);
    expect(hoverAt).toBeGreaterThan(focusAt);
  });

  it("still applies the pressed state while the button is held down", () => {
    const styles = renderButton(textButton(themeWithStates));

    expect(styles).toMatch(
      /button:active\s*{[^}]*background-color:\s*rgba\(170, 170, 170, 1\)/
    );
  });

  it("orders the pressed colours after the focused colours so a press beats a hover", () => {
    const styles = renderButton(textButton(themeWithStates));

    /* Both rules have the same specificity, so the later one wins while the
     * button is simultaneously hovered and held. Compare the state-specific
     * colours rather than the selectors, because the shared button template
     * already contains an unrelated `button:hover` rule for the scale animation. */
    const pressedAt = styles.indexOf("rgba(170, 170, 170, 1)");
    const focusedAt = styles.indexOf("rgba(0, 39, 135, 1)");

    expect(focusedAt).toBeGreaterThan(-1);
    expect(pressedAt).toBeGreaterThan(focusedAt);
  });
});

describe("configured button focus style", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("applies the configured focus style to an image button", () => {
    const styles = renderButton(
      baseButton,
      withFocusStyle({ boxShadow: "0 0 0 4px red" })
    );

    expect(styles).toContain("box-shadow: 0 0 0 4px red;");
  });

  it("applies the configured focus style to a themed button with no focused state", () => {
    const styles = renderButton(
      textButton({ bg_color: "#FF000000", font_color: "#FFFFFFFF" }),
      withFocusStyle({ boxShadow: "0 0 0 4px red" })
    );

    expect(styles).toContain("box-shadow: 0 0 0 4px red;");
  });

  it("lets the campaign focused state win over the configured focus style", () => {
    const styles = renderButton(
      textButton({
        bg_color: "#FF000000",
        focused_state: { bg_color: "#FF00FF00" },
      }),
      withFocusStyle({ boxShadow: "0 0 0 4px red" })
    );

    expect(styles).not.toContain("box-shadow: 0 0 0 4px red;");
    expect(styles).toContain("box-shadow: none;");
  });

  it("suppresses the default focus ring on a themed button when nothing is configured", () => {
    const styles = renderButton(
      textButton({ bg_color: "#FF000000" }),
      undefined
    );

    expect(styles).toContain("box-shadow: none;");
  });

  it("keeps the default focus ring on an image button when nothing is configured", () => {
    const styles = renderButton(baseButton, undefined);

    expect(styles).toContain("box-shadow: 0 0 0 0.2rem rgb(0 123 255 / 50%);");
    expect(styles).not.toContain("box-shadow: 0 0 0 4px red;");
  });

  it("styles a themed button from its campaign theme alone, as iOS and Android do", () => {
    const styles = renderButton(textButton({ font_color: "#FF112233" }), {
      autoShowMessagesMaxDelay: 0,
      personalizedTextForegroundColor: "rgb(9, 9, 9)",
      personalizedTextBackgroundColor: "rgb(8, 8, 8)",
      personalizedTextFontStyle: "Papyrus, serif",
    });
    /* The shared template emits the first `button {` rule; the themed styling is
     * the second. */
    const themedRule = styles.match(/button\s*{[^}]*}/g)![1];

    expect(themedRule).toContain("background-color: transparent");
    expect(themedRule).toContain("color: rgba(17, 34, 51, 1)");
    expect(themedRule).toContain("font-family: Arial");
  });

  it("never applies the text config to a themed button, in any state", () => {
    const styles = renderButton(
      textButton({
        font_color: "#FF112233",
        pressed_state: { bg_color: "#FFAAAAAA" },
        focused_state: { bg_color: "#FF002787" },
      }),
      {
        autoShowMessagesMaxDelay: 0,
        personalizedTextForegroundColor: "rgb(9, 9, 9)",
        personalizedTextBackgroundColor: "rgb(8, 8, 8)",
        personalizedTextFontStyle: "Papyrus, serif",
      }
    );

    expect(styles).not.toContain("rgb(9, 9, 9)");
    expect(styles).not.toContain("rgb(8, 8, 8)");
    expect(styles).not.toContain("Papyrus");
  });

  it("applies the configured personalized text colours and font to a legacy text button", () => {
    const styles = renderButton(textButton(), {
      autoShowMessagesMaxDelay: 0,
      personalizedTextForegroundColor: "rgb(9, 9, 9)",
      personalizedTextBackgroundColor: "rgb(8, 8, 8)",
      personalizedTextFontStyle: "Papyrus, serif",
    });

    expect(styles).toContain("color: rgb(9, 9, 9)");
    expect(styles).toContain("background-color: rgb(8, 8, 8)");
    expect(styles).toContain("font-family: Papyrus, serif");
  });

  it("accepts a raw CSS declaration string", () => {
    const styles = renderButton(
      baseButton,
      withFocusStyle("outline: 3px solid yellow")
    );

    expect(styles).toContain("outline: 3px solid yellow;");
  });

  it("drops a configured value that would inject extra rules", () => {
    const styles = renderButton(
      baseButton,
      withFocusStyle({ opacity: "1 } body { display: none " })
    );

    expect(styles).not.toContain("display: none");
  });
});
