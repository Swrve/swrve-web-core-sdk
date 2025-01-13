import IDictionary from "./IDictionary";

export default interface IPushEvent {
  event_type: string;
  event: string;
  payload: IDictionary<string>;
  user_id: string;
  id: number;
  timestamp: number;
}
