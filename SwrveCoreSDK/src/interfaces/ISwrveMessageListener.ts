/**
 * The in-app message interaction that triggered the listener.
 *
 * Mirrors `SwrveMessageAction` on iOS/Android. There is deliberately no
 * `CopyToClipboard` case: copy-to-clipboard is not meaningful in a browser and
 * clipboard button actions are not delivered to Web clients.
 */
export enum SwrveMessageAction {
  Impression = "impression",
  Custom = "custom",
  Dismiss = "dismiss",
}

/** Details of the button the user selected. */
export interface ISwrveMessageButtonDetails {
  buttonName: string;
  buttonText?: string;
  actionType: string;
  actionString: string;
}

/** Details of the in-app message the interaction belongs to. */
export interface ISwrveMessageDetails {
  campaignId?: number;
  variantId: number;
  messageName: string;
  /** Only populated for Message Center campaigns. */
  campaignSubject?: string;
}

/**
 * Single callback for all in-app message interactions.
 *
 * `selectedButton` is undefined for {@link SwrveMessageAction.Impression},
 * matching iOS (`nil`) and Android (`null`).
 */
export declare type OnSwrveInAppMessageListener = (
  action: SwrveMessageAction,
  messageDetails: ISwrveMessageDetails,
  selectedButton?: ISwrveMessageButtonDetails
) => void;
