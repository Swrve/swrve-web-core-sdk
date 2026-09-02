import { SWRVE_IAM_BUTTON_TEMPLATE_LITERAL } from "../src/Campaigns/Messages/SwrveInAppConstants";

describe("SWRVE_IAM_BUTTON_TEMPLATE_LITERAL button hover/focus animation", () => {
  it("scales the button up slightly on hover and keyboard focus instead of dimming its opacity", () => {
    // The button should no longer fade out on hover.
    expect(SWRVE_IAM_BUTTON_TEMPLATE_LITERAL).not.toContain("opacity: 60%");

    // It should grow slightly on both mouse hover and keyboard focus.
    expect(SWRVE_IAM_BUTTON_TEMPLATE_LITERAL).toContain("button:hover");
    expect(SWRVE_IAM_BUTTON_TEMPLATE_LITERAL).toContain("button:focus");
    expect(SWRVE_IAM_BUTTON_TEMPLATE_LITERAL).toMatch(/transform:\s*scale\(1\.05\)/);

    // The size change should animate smoothly.
    expect(SWRVE_IAM_BUTTON_TEMPLATE_LITERAL).toMatch(
      /transition:\s*transform\s+150ms\s+ease-out/
    );
  });
});

describe("SWRVE_IAM_BUTTON_TEMPLATE_LITERAL focus ring", () => {
  it("suppresses the focus ring for pointer focus, so clicking does not draw a box", () => {
    expect(SWRVE_IAM_BUTTON_TEMPLATE_LITERAL).toMatch(
      /button:focus:not\(:focus-visible\)\s*{[^}]*box-shadow:\s*none/
    );
  });

  it("keeps the ring on plain focus, so engines without :focus-visible still show it", () => {
    expect(SWRVE_IAM_BUTTON_TEMPLATE_LITERAL).toMatch(
      /button:focus\s*{[^}]*box-shadow:\s*0 0 0 0\.2rem/
    );
  });
});
