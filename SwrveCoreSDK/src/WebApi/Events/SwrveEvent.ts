import ICurrencyGivenEvent from "../../interfaces/ICurrencyGivenEvent";
import IIAPEvent from "../../interfaces/IIAPEvent";
import INamedEvent from "../../interfaces/INamedEvent";
import IPurchaseEvent from "../../interfaces/IPurchaseEvent";
import ISessionStartEvent from "../../interfaces/ISessionStartEvent";
import IUserUpdateEvent from "../../interfaces/IUserUpdateEvent";
import QAEvent from "./QA/QAEvent";
import IDeviceUpdateEvent from "../../interfaces/IDeviceUpdateEvent";

type SwrveEvent =
  | QAEvent
  | ICurrencyGivenEvent
  | IIAPEvent
  | INamedEvent
  | IPurchaseEvent
  | ISessionStartEvent
  | IUserUpdateEvent
  | IDeviceUpdateEvent;

export default SwrveEvent;
