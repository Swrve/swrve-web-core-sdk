import {
  ISwrveButton,
  ISwrveImage,
  ISwrveInAppMessage,
  ISwrvePage,
  ISwrveStoryDismissButton,
} from "../../interfaces/ISwrveCampaign";
import { SwrveImage } from "./UIElements/SwrveImage";
import { SwrveButton } from "./UIElements/SwrveButton";
import { TextTemplating } from "../../utils/TextTemplating";
import {
    Animation,
    Position,
  SWRVE_IAM_BUTTON,
  SWRVE_IAM_BUTTON_CLICK_EVENT,
  SWRVE_IAM_CANVAS,
  SWRVE_IAM_DATA_CAPTURE_EVENT,
  SWRVE_IAM_ENTER_ANIMATIONS,
  SWRVE_IAM_GENERIC_CAMPAIGN_EVENT,
  SWRVE_IAM_IMAGE,
  SWRVE_IAM_OVERLAY,
  SWRVE_IAM_POSITIONS,
  SWRVE_IAM_TEMPLATE_LITERAL,
} from "./SwrveInAppConstants";
import HTMLSwrveImageElement from "./HTMLSwrveImageElement";
import HTMLSwrveButtonElement from "./HTMLSwrveButtonElement";
import { ISwrveInAppMessageConfig } from "../../interfaces/ISwrveConfig";

type PageElement =
  | { type: "image"; element: ISwrveImage; index: number; order: number }
  | { type: "button"; element: ISwrveButton; index: number; order: number };

/**
 * The parts of an in-app message that come from the chosen format, as opposed
 * to the campaign. These are the only fields that change when the viewport
 * rotates and a different format is selected.
 */
export type ISwrveInAppMessageFormat = Pick<
  ISwrveInAppMessage,
  | "images"
  | "buttons"
  | "pages"
  | "storySettings"
  | "scale"
  | "calibration"
  | "canvasWidth"
  | "canvasHeight"
  | "color"
>;

/**
 * Computes the CSS transform used to fit the IAM canvas to the viewport, or
 * returns null when the canvas has no size.
 *
 * `viewport` should be the VISUAL viewport dimensions when available (the
 * actually-visible area on mobile, excluding the browser toolbars) so a tall
 * IAM isn't scaled larger than the visible screen and clipped under the bars.
 */
export function computeCanvasScaleTransform(
  canvasWidth: number,
  canvasHeight: number,
  viewport: {
    width: number;
    height: number;
  }
): string | null {
  if (canvasWidth <= 0 || canvasHeight <= 0) {
    return null;
  }

  const scale = Math.min(
    viewport.width / canvasWidth,
    viewport.height / canvasHeight,
    1
  );

  return `scale(${scale})`;
}

class HTMLSwrveInAppElement extends HTMLElement {
  private _root: ShadowRoot;
  private _overlayElement: HTMLDivElement;
  private _canvasElement: HTMLDivElement;
  private _styles: HTMLStyleElement;
  private _message: ISwrveInAppMessage | undefined;
  private _currentPageId: number | undefined;
  private _pageViewEventsSent: number[] = [];
  private _navigationEventsSent: number[] = [];
  private _videoStartedEventsSent: number[] = [];
  private _videoEndedEventsSent: number[] = [];
  private _storyTimer: number | undefined;
  private _inAppConfig?: ISwrveInAppMessageConfig;
  private _boundScaleCanvasToViewport = this.scaleCanvasToViewport.bind(this);

  constructor() {
    super();
    this._root = this.attachShadow({ mode: "closed" });
    this._root.appendChild(
      document.importNode(HTMLSwrveInAppElement.template().content, true)
    );
    this._overlayElement = this._root.querySelector(`.${SWRVE_IAM_OVERLAY}`)!;
    this._canvasElement = this._root.querySelector(`.${SWRVE_IAM_CANVAS}`)!;
    this._styles = this._root.querySelector("style")!;
  }

  public get animation(): Animation {
    return this.getAttribute("animation") as Animation;
  }

  public get position(): Position {
    return this.getAttribute("position") as Position;
  }

  public get message(): ISwrveInAppMessage | undefined {
    return this._message;
  }

  public set animation(animation: Animation) {
    this.setAttribute("animation", animation.toString());
  }

  public set position(position: Position) {
    this.setAttribute("position", position.toString());
  }

  public set message(message: ISwrveInAppMessage | undefined) {
    this._message = message;
    this._currentPageId = undefined;
    this._pageViewEventsSent = [];
    this._navigationEventsSent = [];
    this._videoStartedEventsSent = [];
    this._videoEndedEventsSent = [];
    this.clearStoryTimer();
  }

  public set inAppConfig(inAppConfig: ISwrveInAppMessageConfig | undefined) {
    this._inAppConfig = inAppConfig;
  }

  public get inAppConfig(): ISwrveInAppMessageConfig | undefined{
    return this._inAppConfig;
  }

  public connectedCallback() {
    // this._styles.textContent += SWRVE_IAM_ENTER_ANIMATIONS[this.animation].templateLiteral;
    // this._canvasElement.classList.add(SWRVE_IAM_ENTER_ANIMATIONS[this.animation].className);
    this._styles.textContent += SWRVE_IAM_POSITIONS[this.position];
    window.addEventListener("resize", this._boundScaleCanvasToViewport);
  }

  public disconnectedCallback() {
    window.removeEventListener("resize", this._boundScaleCanvasToViewport);
  }

  public show(): void {
    this.renderMessage();
  }

  /**
   * Swaps in a different format for the message already on screen, for example
   * when the viewport rotates from portrait to landscape.
   *
   * Deliberately does not go through the `message` setter: that resets the
   * current page and the analytics dedup state, which would send the user back
   * to page one and re-fire page_view/navigation/video events they have already
   * generated. This mirrors iOS and Android, which both keep that state across
   * a format change.
   */
  public swapFormat(format: ISwrveInAppMessageFormat): void {
    if (!this._message) {
      return;
    }

    /* `color` is set explicitly rather than left to the spread: a format that
     * does not define one must clear the previous format's color instead of
     * inheriting it. */
    this._message = { ...this._message, ...format, color: format.color };
    this.renderMessage();
  }

  public close(): void {
    this.removeMessage();
  }

  private handleButtonClick(button: ISwrveButton, index: number): void {
    if (this.isPageLinkButton(button)) {
      this.showLinkedPage(button, index);
      this.dispatchDataCaptureEvents(button);
      return;
    }

    if (String(button.type.value) === "DISMISS") {
      this.dispatchDismissEvent(button, index);
    }

    this.dispatchDataCaptureEvents(button);

    const page = this.getActivePage();

    this.dispatchEvent(
      new CustomEvent(SWRVE_IAM_BUTTON_CLICK_EVENT, {
        detail: {
          button: button,
          message: this._message?.message,
          buttonId: this.getButtonId(button, index),
          contextId: page ? Number(page.page_id) : undefined,
          pageName: page ? page.page_name : undefined,
          personalizationProperties: this._message?.personalizationProperties,
        },
      })
    );

    this.close();
  }

  private renderMessage(): void {
    this._canvasElement.style.width = `${this.message?.canvasWidth || 0}px`;
    this._canvasElement.style.height = `${this.message?.canvasHeight || 0}px`;
    this.applyBackgroundColor();

    this.clearStoryTimer();
    this._canvasElement.innerHTML = "";
    this.appendPageElements();
    this.appendStoryControls();
    this.scaleCanvasToViewport();
    this.dispatchPageViewEvent();
    this.startStoryTimer();

    this._overlayElement.style.display = "flex";


  }

  private removeMessage(): void {
    this.clearStoryTimer();
    this._overlayElement.style.display = "none";
    this._canvasElement.style.width = "0px";
    this._canvasElement.style.height = "0px";
    this._canvasElement.style.transform = "";
    this._canvasElement.innerHTML = "";
    this._message = undefined;
    this._currentPageId = undefined;
    this._pageViewEventsSent = [];
    this._navigationEventsSent = [];
    this._videoStartedEventsSent = [];
    this._videoEndedEventsSent = [];
  }

  private isPageLinkButton(button: ISwrveButton): boolean {
    return String(button.type.value) === "PAGE_LINK";
  }

  private showLinkedPage(button: ISwrveButton, index: number): void {
    const pageId = this.getButtonActionPageId(button);
    if (pageId === null || !this.getPageById(pageId)) {
      return;
    }

    this.dispatchNavigationEvent(button, index, pageId);
    this._currentPageId = pageId;
    this.renderMessage();
  }

  private showPageByIndex(pageIndex: number): void {
    const pages = this._message?.pages || [];
    if (pageIndex < 0 || pageIndex >= pages.length) {
      return;
    }

    this._currentPageId = pages[pageIndex].page_id;
    this.renderMessage();
  }

  private getButtonActionPageId(button: ISwrveButton): number | null {
    const action = String(button.action.value || "");
    let resolvedAction = action;

    try {
      const resolved = TextTemplating.applyTextTemplatingToString(
        action,
        this._message?.personalizationProperties
      );
      if (resolved !== null) {
        resolvedAction = resolved;
      }
    } catch (e) {}

    if (!resolvedAction) {
      return null;
    }

    const pageId = Number(resolvedAction);
    return isNaN(pageId) ? null : pageId;
  }

  private getActivePage(): ISwrvePage | undefined {
    const pages = this._message?.pages;
    if (!pages || pages.length === 0) {
      return undefined;
    }

    if (this._currentPageId === undefined) {
      this._currentPageId = pages[0].page_id;
    }

    return this.getPageById(this._currentPageId) || pages[0];
  }

  private getPageById(pageId: number): ISwrvePage | undefined {
    return this._message?.pages?.find((page) => Number(page.page_id) === pageId);
  }

  private getActivePageIndex(): number {
    const pages = this._message?.pages || [];
    const activePage = this.getActivePage();
    if (!activePage) {
      return -1;
    }

    return pages.findIndex(
      (page) => Number(page.page_id) === Number(activePage.page_id)
    );
  }

  private getButtonId(button: ISwrveButton, index: number): number {
    const buttonId =
      button.id ||
      button.button_id ||
      button.ui_order ||
      index + 1;

    return Number(buttonId);
  }

  private dispatchPageViewEvent(): void {
    const page = this.getActivePage();
    if (!this._message || !page) {
      return;
    }

    const pageId = Number(page.page_id);
    if (this._pageViewEventsSent.indexOf(pageId) !== -1) {
      return;
    }

    this.dispatchGenericCampaignEvent(
      "page_view",
      pageId,
      undefined,
      this.getPageEventPayload(page)
    );
    this._pageViewEventsSent.push(pageId);
  }

  private dispatchNavigationEvent(button: ISwrveButton, index: number, pageIdToShow: number): void {
    const page = this.getActivePage();
    if (!page) {
      return;
    }

    const buttonId = this.getButtonId(button, index);
    if (this._navigationEventsSent.indexOf(buttonId) !== -1) {
      return;
    }

    const payload = this.getPageEventPayload(page);
    payload.to = pageIdToShow;
    payload.buttonId = buttonId;
    if (button.name) {
      payload.buttonName = button.name;
    }

    this.dispatchGenericCampaignEvent(
      "navigation",
      Number(page.page_id),
      undefined,
      payload
    );
    this._navigationEventsSent.push(buttonId);
  }

  private dispatchDismissEvent(button: ISwrveButton, index: number): void {
    const page = this.getActivePage();
    if (!page) {
      return;
    }

    const buttonId = this.getButtonId(button, index);
    const payload = this.getPageEventPayload(page);
    payload.buttonId = buttonId;
    if (button.name) {
      payload.buttonName = button.name;
    }

    this.dispatchGenericCampaignEvent(
      "dismiss",
      Number(page.page_id),
      undefined,
      payload
    );
  }

  private dispatchStoryDismissEvent(
    buttonId?: number,
    buttonName?: string
  ): void {
    const page = this.getActivePage();
    if (!page) {
      return;
    }

    const payload = this.getPageEventPayload(page);
    if (buttonName) {
      payload.buttonName = buttonName;
    }
    if (buttonId && buttonId > 0) {
      payload.buttonId = buttonId;
    }

    this.dispatchGenericCampaignEvent(
      "dismiss",
      Number(page.page_id),
      undefined,
      payload
    );
  }

  private getPageEventPayload(page: ISwrvePage): { [key: string]: string | number } {
    const payload: { [key: string]: string | number } = {};

    if (page.page_name) {
      payload.pageName = page.page_name;
    }

    return payload;
  }

  private dispatchGenericCampaignEvent(
    actionType: string,
    contextId: number,
    mediaId: number | undefined,
    payload: { [key: string]: string | number }
  ): void {
    if (!this._message) {
      return;
    }

    const detail: {
      campaignType: string;
      actionType: string;
      id: string | number;
      contextId: number;
      mediaId?: number;
      payload: { [key: string]: string | number };
    } = {
      campaignType: "iam",
      actionType,
      id: this._message.message.id,
      contextId,
      payload,
    };

    if (mediaId !== undefined) {
      detail.mediaId = mediaId;
    }

    this.dispatchEvent(
      new CustomEvent(SWRVE_IAM_GENERIC_CAMPAIGN_EVENT, {
        detail,
      })
    );
  }

  private dispatchVideoEvent(actionType: string, mediaId?: number): void {
    const page = this.getActivePage();
    if (!page) {
      return;
    }

    const pageId = Number(page.page_id);
    if (
      actionType === "video_started" &&
      this._videoStartedEventsSent.indexOf(pageId) !== -1
    ) {
      return;
    }

    if (
      actionType === "video_ended" &&
      this._videoEndedEventsSent.indexOf(pageId) !== -1
    ) {
      return;
    }

    this.dispatchGenericCampaignEvent(
      actionType,
      pageId,
      mediaId,
      this.getPageEventPayload(page)
    );

    if (actionType === "video_started") {
      this._videoStartedEventsSent.push(pageId);
    }

    if (actionType === "video_ended") {
      this._videoEndedEventsSent.push(pageId);
    }
  }

  private dispatchDataCaptureEvents(button: ISwrveButton): void {
    if (!button.events && !button.user_updates) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent(SWRVE_IAM_DATA_CAPTURE_EVENT, {
        detail: {
          events: button.events || [],
          user_updates: button.user_updates || [],
          personalizationProperties: this._message?.personalizationProperties,
        },
      })
    );
  }

  private appendStoryControls(): void {
    if (!this.hasStorySettings()) {
      return;
    }

    this.appendStoryProgressBar();
    this.appendStoryDismissButton();
  }

  private appendStoryProgressBar(): void {
    const settings = this._message!.storySettings!;
    const pages = this._message!.pages || [];
    const activePageIndex = this.getActivePageIndex();
    const padding = settings.padding || {};
    const progressBar = settings.progress_bar || {};
    const top = Number(padding.top || 0);
    const left = Number(padding.left || 0);
    const right = Number(padding.right || 0);
    const height = Number(progressBar.h || 4);
    const segmentGap = Number(progressBar.segment_gap || 0);
    const barColor = this.normalizeColor(progressBar.bar_color || "#FFFFFFFF");
    const bgColor = this.normalizeColor(progressBar.bg_color || "#66FFFFFF");
    const duration = this.getActiveStoryPageDuration();

    const storyContainer = document.createElement("div");
    storyContainer.className = "swrveIAM__story-progress";
    storyContainer.style.position = "absolute";
    storyContainer.style.top = `${top}px`;
    storyContainer.style.left = `${left}px`;
    storyContainer.style.right = `${right}px`;
    storyContainer.style.height = `${height}px`;
    storyContainer.style.display = "flex";
    storyContainer.style.gap = `${segmentGap}px`;
    storyContainer.style.zIndex = "100000";
    storyContainer.style.pointerEvents = "none";

    pages.forEach((page, index) => {
      const segment = document.createElement("div");
      const progress = document.createElement("div");
      segment.className = "swrveIAM__story-segment";
      progress.className = "swrveIAM__story-segment-progress";
      segment.style.flex = "1";
      segment.style.height = "100%";
      segment.style.backgroundColor = bgColor;
      segment.style.borderRadius = `${height / 2}px`;
      segment.style.overflow = "hidden";

      progress.style.height = "100%";
      progress.style.backgroundColor = barColor;
      progress.style.borderRadius = `${height / 2}px`;
      progress.style.width =
        index < activePageIndex ? "100%" : "0";
      progress.style.transition =
        index === activePageIndex ? `width ${duration}ms linear` : "";

      segment.appendChild(progress);
      storyContainer.appendChild(segment);
    });

    this._canvasElement.appendChild(storyContainer);

    const activeProgress = storyContainer.querySelectorAll(
      ".swrveIAM__story-segment-progress"
    )[activePageIndex] as HTMLDivElement | undefined;
    if (activeProgress) {
      window.setTimeout(() => {
        activeProgress.style.width = "100%";
      }, 0);
    }
  }

  private appendStoryDismissButton(): void {
    const dismissButton = this._message?.storySettings?.dismiss_button;
    if (!dismissButton) {
      return;
    }

    const settings = this._message!.storySettings!;
    const padding = settings.padding || {};
    const progressBar = settings.progress_bar || {};
    const size = Number(dismissButton.size || 32);
    const top =
      Number(padding.top || 0) +
      Number(progressBar.h || 4) +
      Number(dismissButton.margin_top || 0);
    const right = Number(padding.right || 0);
    const button = document.createElement("button");
    const normalColor = this.normalizeColor(dismissButton.color || "#FFFFFFFF");
    const pressedColor = this.normalizeColor(
      dismissButton.pressed_color || dismissButton.color || "#FFFFFFFF"
    );
    const focusedColor = this.normalizeColor(
      dismissButton.focused_color || dismissButton.color || "#FFFFFFFF"
    );

    button.className = "swrveIAM__story-dismiss-button";
    button.type = "button";
    button.setAttribute(
      "aria-label",
      dismissButton.accessibility_text || dismissButton.name || "Dismiss"
    );
    button.style.position = "absolute";
    button.style.top = `${top}px`;
    button.style.right = `${right}px`;
    button.style.width = `${size}px`;
    button.style.height = `${size}px`;
    button.style.padding = "0";
    button.style.border = "0";
    button.style.background = "transparent";
    button.style.color = normalColor;
    button.style.cursor = "pointer";
    button.style.zIndex = "100001";
    button.innerHTML = this.storyDismissIconSvg();

    button.addEventListener("mousedown", () => {
      button.style.color = pressedColor;
    });
    button.addEventListener("mouseup", () => {
      button.style.color = normalColor;
    });
    button.addEventListener("mouseleave", () => {
      button.style.color = normalColor;
    });
    button.addEventListener("focus", () => {
      button.style.color = focusedColor;
    });
    button.addEventListener("blur", () => {
      button.style.color = normalColor;
    });
    button.addEventListener("click", () => {
      this.handleStoryDismissButtonClick(dismissButton);
    });

    this._canvasElement.appendChild(button);
  }

  private handleStoryDismissButtonClick(
    dismissButton: ISwrveStoryDismissButton
  ): void {
    const button = this.createStoryDismissButton(dismissButton);
    this.dispatchStoryDismissEvent(dismissButton.id, dismissButton.name);
    this.dispatchEvent(
      new CustomEvent(SWRVE_IAM_BUTTON_CLICK_EVENT, {
        detail: {
          button,
          message: this._message?.message,
          personalizationProperties: this._message?.personalizationProperties,
        },
      })
    );
    this.close();
  }

  private createStoryDismissButton(
    dismissButton: ISwrveStoryDismissButton
  ): ISwrveButton {
    const size = Number(dismissButton.size || 0);
    return {
      id: dismissButton.id,
      name: dismissButton.name || "Dismiss",
      x: { type: "number", value: 0 },
      y: { type: "number", value: 0 },
      w: { type: "number", value: size },
      h: { type: "number", value: size },
      image_width: size,
      image_height: size,
      image_filename: "",
      type: { type: "text", value: "DISMISS" },
      action: { type: "text", value: "" },
      game_id: { type: "number", value: "" },
    };
  }

  private startStoryTimer(): void {
    if (!this.hasStorySettings()) {
      return;
    }

    const duration = this.getActiveStoryPageDuration();
    this._storyTimer = window.setTimeout(() => {
      this.handleStorySegmentFinished();
    }, duration);
  }

  private clearStoryTimer(): void {
    if (this._storyTimer !== undefined) {
      window.clearTimeout(this._storyTimer);
      this._storyTimer = undefined;
    }
  }

  private handleStorySegmentFinished(): void {
    const pages = this._message?.pages || [];
    const activePageIndex = this.getActivePageIndex();
    if (activePageIndex < 0) {
      return;
    }

    if (activePageIndex < pages.length - 1) {
      this.showPageByIndex(activePageIndex + 1);
      return;
    }

    this.handleLastStoryPageProgression();
  }

  private handleLastStoryPageProgression(): void {
    const settings = this._message?.storySettings;
    const progression = String(settings?.last_page_progression || "stop");

    if (progression === "dismiss") {
      this.dispatchStoryDismissEvent(
        settings?.last_page_dismiss_id,
        settings?.last_page_dismiss_name
      );
      this.close();
      return;
    }

    if (progression === "loop") {
      this.showPageByIndex(0);
    }
  }

  private getActiveStoryPageDuration(): number {
    const page = this.getActivePage();
    const storySettings = this._message?.storySettings;
    const pageDuration = page && page.page_duration !== undefined
      ? page.page_duration
      : storySettings?.page_duration;
    const duration = Number(pageDuration || 0);

    return duration > 0 ? duration : 5000;
  }

  private hasStorySettings(): boolean {
    return !!(
      this._message &&
      this._message.storySettings &&
      this._message.pages &&
      this._message.pages.length > 0
    );
  }

  private storyDismissIconSvg(): string {
    return `
      <svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true">
        <path
          d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.42 1.41L12 13.41l4.89 4.9a1 1 0 0 0 1.41-1.42L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4z"
          fill="currentColor"
        />
      </svg>
    `;
  }

  private normalizeColor(color: string): string {
    const normalizedColor = String(color || "").trim();

    if (!normalizedColor) {
      return "transparent";
    }

    if (/^#[0-9a-f]{8}$/i.test(normalizedColor)) {
      return this.swrveHexToRgba(normalizedColor.substring(1));
    }

    if (/^[0-9a-f]{8}$/i.test(normalizedColor)) {
      return this.swrveHexToRgba(normalizedColor);
    }

    if (/^#|^rgb|^hsl|^[a-z]+$/i.test(normalizedColor)) {
      return normalizedColor;
    }

    return `#${normalizedColor}`;
  }

  private swrveHexToRgba(value: string): string {
    const alpha = parseInt(value.substring(0, 2), 16) / 255;
    const red = parseInt(value.substring(2, 4), 16);
    const green = parseInt(value.substring(4, 6), 16);
    const blue = parseInt(value.substring(6, 8), 16);
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  /**
   * Colors the area behind the message, mirroring iOS `setControllerBackgroundColor`
   * and Android `SwrveMessageView.initializeLayout`: the color authored on the
   * campaign format wins, `defaultBackgroundColor` from the in-app config is the
   * fallback when the campaign does not specify one, and an empty value leaves
   * the stylesheet default in place when neither does. The canvas holding the
   * message content is never colored, on any platform.
   */
  private applyBackgroundColor(): void {
    const backgroundColor =
      this._message?.color || this._inAppConfig?.defaultBackgroundColor;

    this._overlayElement.style.backgroundColor = backgroundColor
      ? this.normalizeColor(backgroundColor)
      : "";
  }

  private scaleCanvasToViewport(): void {
    if (!this._message) {
      return;
    }

    const vv = window.visualViewport;
    const transform = computeCanvasScaleTransform(
      this._message.canvasWidth || 0,
      this._message.canvasHeight || 0,
      {
        width: vv ? vv.width : window.innerWidth,
        height: vv ? vv.height : window.innerHeight,
      }
    );

    if (transform === null) {
      return;
    }

    this._canvasElement.style.transform = transform;
    this._canvasElement.style.transformOrigin = "center center";
  }

  private appendPageElements(): void {
    this.getPageElements().forEach((pageElement): void => {
      if (pageElement.type === "image") {
        this.appendImage(pageElement.element, pageElement.index);
      } else {
        this.appendButton(pageElement.element, pageElement.index);
      }
    });
  }

  private getPageElements(): PageElement[] {
    const images = this.getActivePage()?.images || this._message?.images || [];
    const buttons = this.getActivePage()?.buttons || this._message?.buttons || [];

    const pageElements: PageElement[] = [
      ...images.map((image, index) => ({
        type: "image" as "image",
        element: image,
        index,
        order: index,
      })),
      ...buttons.map((button, index) => ({
        type: "button" as "button",
        element: button,
        index,
        order: images.length + index,
      })),
    ];

    return pageElements.sort((a, b) => {
      const zIndexDifference =
        this.getIAMZIndex(a.element) - this.getIAMZIndex(b.element);
      return zIndexDifference !== 0 ? zIndexDifference : a.order - b.order;
    });
  }

  private getIAMZIndex(element: ISwrveImage | ISwrveButton): number {
    const zIndex = Number(element.iam_z_index || 0);
    return isNaN(zIndex) ? 0 : zIndex;
  }

  private appendImage(image: ISwrveImage, index: number): void {
    const swrveImage = <HTMLSwrveImageElement> document.createElement("swrve-image");
    swrveImage.image = new SwrveImage(image, this._message!.imagesCDN, this._message?.personalizationProperties, this._message!.scale, this._message!.calibration);
    swrveImage.personalizationProperties = this._message!.personalizationProperties!;
    swrveImage.inAppConfig = this.inAppConfig;
    swrveImage.onVideoEvent = (actionType, mediaId) =>
      this.dispatchVideoEvent(actionType, mediaId);
    swrveImage.canvasHeight = this.message!.canvasHeight;
    swrveImage.canvasWidth = this.message!.canvasWidth;
    swrveImage.id = `${SWRVE_IAM_IMAGE}-${index}`;

    this._canvasElement.appendChild(swrveImage);
  }

  private appendButton(button: ISwrveButton, index: number): void {
    const swrveButton = <HTMLSwrveButtonElement> document.createElement("swrve-button");
    swrveButton.button = new SwrveButton(button, this._message!.imagesCDN, this._message?.personalizationProperties, this._message!.scale, this._message!.calibration);
    swrveButton.personalizationProperties = this._message!.personalizationProperties!;
    swrveButton.inAppConfig = this.inAppConfig;
    swrveButton.onclick = () => this.handleButtonClick(button, index);
    swrveButton.canvasHeight = this.message!.canvasHeight;
    swrveButton.canvasWidth = this.message!.canvasWidth;
    swrveButton.id = `${SWRVE_IAM_BUTTON}-${index}`;

    this._canvasElement.appendChild(swrveButton);
  }

  private static template(): HTMLTemplateElement {
    const template = document.createElement("template");
    template.innerHTML = SWRVE_IAM_TEMPLATE_LITERAL;

    return template;
  }
}

export default HTMLSwrveInAppElement;
