import { IDictionary } from "..";
import { ISwrvePushInboxMessageRaw } from "./IPushInbox";

export interface ISwrveCampaignResourceResponse {
  real_time_user_properties?: IDictionary<string>;
  user_resources?: ReadonlyArray<IUserResource>;
  location_campaigns?: object;
  campaigns: ISwrveCampaigns;
  qa?: {
    reset_device_state: boolean;
    logging: boolean;
    logging_url?: string;
    campaigns?: ReadonlyArray<ISwrveCampaign>;
  };
  flush_frequency: number;
  flush_refresh_delay: number;
  web_push_public_key?: string;
  push_inbox?: ReadonlyArray<ISwrvePushInboxMessageRaw>;
  push_inbox_hash?: string;
}

export interface IUserResource {
  [key: string]: string;
}

export interface IQAUser {
  reset_device_state: boolean;
  logging: boolean;
  logging_url?: string;
  campaigns?: ReadonlyArray<ISwrveCampaign>;
}

export interface ISwrveCampaigns {
  game_data: object;
  campaigns: ReadonlyArray<ISwrveCampaign>;
  rules: ISwrveGlobalRule;
  cdn_root?: string;
  cdn_paths?: { message_images: string; message_fonts: string };
  version: number;
}

export interface ISwrveCampaign {
  id: number;
  start_date: number;
  end_date: number;
  start_date_iso?: string;
  end_date_iso?: string;
  timezone_type?: "global" | "local" | string;
  blackout_dates?: ReadonlyArray<ISwrveDateRange>;
  interval_times?: ReadonlyArray<ISwrveTimeRange>;
  rules: ISwrveCampaignRule;
  triggers?: ReadonlyArray<ISwrveTrigger>;
  message_center: boolean;
  embedded_message?: ISwrveEmbeddedMessage;
  message?: ISwrveMessage;
  message_center_details?: ISwrveMessageCenterDetails;
  subject: string | null;
}

export interface ISwrveDateRange {
  from: string;
  to: string;
}

export interface ISwrveTimeRange {
  from: string;
  to: string;
}

export interface ISwrveTrigger {
  event_name: string;
  conditions?: ISwrveCondition;
  parentCampaign?: number;
}

export interface ISwrveConditionEq {
  op: "eq";
  key: string;
  value: string | number;
}

export interface ISwrveConditionContains {
  op: "contains";
  key: string;
  value: string | number;
}

export interface ISwrveConditionNumberCompare {
  op: "number_eq" | "number_gt" | "number_lt";
  key: string;
  value: number;
}

export interface ISwrveConditionNumberBetween {
  op: "number_between" | "number_not_between";
  key: string;
  value: {
    lower: number;
    upper: number;
  };
}

export interface ISwrveConditionAnd {
  op: "and";
  args: ReadonlyArray<ISwrveCondition>;
}

export interface ISwrveConditionOr {
  op: "or";
  args: ReadonlyArray<ISwrveCondition>;
}

export interface ISwrveConditionEmpty {
  op?: undefined;
}

export type ISwrveCondition =
  | ISwrveConditionEq
  | ISwrveConditionContains
  | ISwrveConditionNumberCompare
  | ISwrveConditionNumberBetween
  | ISwrveConditionAnd
  | ISwrveConditionOr
  | ISwrveConditionEmpty;

export interface ISwrveCampaignRule {
  delay_first_message: number;
  dismiss_after_views: number;
  display_order: string;
  min_delay_between_messages: number;
}

export interface ISwrveGlobalRule {
  delay_first_message?: number;
  min_delay_between_messages?: number;
  max_messages_per_session?: number;
}

export interface ISwrveBaseMessage {
  id: number;
  name: string;
  priority: number;
  rules: { orientations: string };
  parentCampaign?: number;
  message_center_details?: ISwrveMessageCenterDetails;
  control?: boolean;
}

export interface ISwrveMessageCenterDetails {
  subject?: string;
  description?: string;
  accessibility_text?: string;
  image_asset?: string;
  dynamic_image_url?: string;
}

export interface ISwrveEmbeddedMessage extends ISwrveBaseMessage {
 /** Original, unpersonalized content as received from the server */
  dataRaw: string;
  /** Personalized content (may differ from dataRaw) */
  data: string;
  buttons: ReadonlyArray<string>;
  type: "other" | "json";
}

export interface ISwrveMessage extends ISwrveBaseMessage {
  template: { formats: ReadonlyArray<ISwrveFormat> };
}

export interface ISwrveInAppMessage {
  personalizationProperties?: IDictionary<string>;
  message: ISwrveMessage;
  parentCampaign: ISwrveCampaign;
  images: ReadonlyArray<ISwrveImage>;
  buttons: ReadonlyArray<ISwrveButton>;
  pages?: ReadonlyArray<ISwrvePage>;
  storySettings?: ISwrveStorySettings;
  /** Background color of the canvas, authored on the campaign format */
  color?: string;
  scale: number;
  calibration?: ISwrveCalibration;
  imagesCDN: string;
  canvasHeight: number;
  canvasWidth: number;
}


export interface ISwrveFormat {
  name: string;
  orientation: string;
  language: string;
  size: ISwrveSize;
  images: ReadonlyArray<ISwrveImage>;
  buttons: ReadonlyArray<ISwrveButton>;
  pages?: ReadonlyArray<ISwrvePage>;
  story_settings?: ISwrveStorySettings;
  scaled_by: number;
  scaled_from: string;
  scale: number;
  calibration?: ISwrveCalibration;
  color?: string;
}

export interface ISwrvePage {
  page_id: number;
  page_name?: string;
  swipe_forward?: number;
  swipe_backward?: number;
  page_duration?: number | string;
  images: ReadonlyArray<ISwrveImage>;
  buttons: ReadonlyArray<ISwrveButton>;
}

export interface ISwrveStorySettings {
  page_duration: number | string;
  last_page_progression?: "dismiss" | "stop" | "loop" | string;
  last_page_dismiss_id?: number;
  last_page_dismiss_name?: string;
  padding?: {
    top?: number;
    right?: number;
    left?: number;
    bottom?: number;
  };
  progress_bar?: {
    bar_color?: string;
    bg_color?: string;
    h?: number;
    segment_gap?: number;
  };
  gestures_enabled?: boolean;
  dismiss_button?: ISwrveStoryDismissButton;
}

export interface ISwrveStoryDismissButton {
  id?: number;
  name?: string;
  color?: string;
  pressed_color?: string;
  focused_color?: string;
  size?: number;
  margin_top?: number;
  accessibility_text?: string;
}

export interface ISwrveCalibration {
  width: number;
  height: number;
  text: string;
  base_font_size: number;
}

export interface ISwrveSize {
  w: ISwrveValue;
  h: ISwrveValue;
}

export interface ISwrveValue {
  type: string;
  value: number | string;
}

export interface ISwrveAsset {
  getAssetID(): string | number;
  getAssetPath(): string | number;
  canRender(): boolean;
  /** True for video assets. The platform decides how to cache an asset, and a
      video generally cannot be cached the same way as an image, so it needs to
      be told which is which. Optional because asset classes outside this repo
      also implement this interface. */
  readonly isVideo?: boolean;
}

export interface ISwrveButton {
  id?: number;
  button_id?: number;
  ui_order?: number;
  iam_z_index?: number;
  name: string;
  x: ISwrveValue;
  y: ISwrveValue;
  w: ISwrveValue;
  h: ISwrveValue;
  image_width: number;
  image_height: number;
  image_filename: string;
  type: ISwrveValue;
  action: ISwrveValue;
  game_id: ISwrveValue;
  image_up?: ISwrveValue;
  dynamic_image_url?: string;
  media_format?: string;
  text?: ISwrveValue;
  theme?: ISwrveButtonTheme;
  events?: ReadonlyArray<ISwrveButtonEvent>;
  user_updates?: ReadonlyArray<ISwrveButtonPayloadItem>;
}

export interface ISwrveButtonEvent {
  name: string;
  payload?: ReadonlyArray<ISwrveButtonPayloadItem>;
}

export interface ISwrveButtonPayloadItem {
  key: string;
  value: string | number | boolean;
}

export interface ISwrveButtonThemeState {
  font_color?: string;
  bg_color?: string;
  border_color?: string;
  bg_image?: ISwrveValue;
}

export interface ISwrveButtonTheme {
  font_size?: string | number;
  truncate?: boolean;
  font_native_style?: string;
  font_file?: string;
  font_postscript_name?: string;
  padding?: ISwrvePadding;
  font_color?: string;
  bg_color?: string;
  border_width?: string | number;
  border_color?: string;
  corner_radius?: string | number;
  bg_image?: ISwrveValue;
  pressed_state?: ISwrveButtonThemeState;
  focused_state?: ISwrveButtonThemeState;
  h_align?: string;
}

export interface ISwrveImage {
  color: ISwrveValue;
  image?: ISwrveValue;
  image_filename: string;
  image_height: number;
  image_width: number;
  iam_z_index?: number;
  media_id?: number;
  name: string;
  w: ISwrveValue;
  x: ISwrveValue;
  y: ISwrveValue;
  h: ISwrveValue;
  dynamic_image_url?: string;
  media_format?: string;
  video_settings?: ISwrveVideoSettings;
  accessibility_text?: string;
  text?: ISwrveValue;
  multiline_text?: {
    value: string;
    font_size?: string | number;
    h_align?: string;
    scrollable?: boolean;
    font_native_style?: string;
    font_file?: string;
    font_postscript_name?: string;
    line_height?: string | number;
    bg_color?: string;
    font_color?: string;
    padding?: ISwrvePadding;
  };
}

export interface ISwrveVideoSettings {
  auto_play?: boolean;
  loop?: boolean;
  fill_screen?: boolean;
  show_controls?: boolean;
}

export interface ISwrvePadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
