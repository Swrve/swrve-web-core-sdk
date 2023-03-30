import {
  ICampaignDownloadData,
  IQATriggerReport,
  IQACampaignTriggerEvent,
} from "./EventTypeInterfaces";
import { ISwrveBaseMessage, ISwrveMessage } from "../interfaces/ISwrveCampaign";
import ISessionStartEvent from "../interfaces/ISessionStartEvent";
import INamedEvent from "../interfaces/INamedEvent";
import IDictionary from "../interfaces/IDictionary";
import IUserUpdateEvent from "../interfaces/IUserUpdateEvent";
import IDeviceUpdateEvent from "../interfaces/IDeviceUpdateEvent";
import IReadonlyDictionary from "../interfaces/IReadonlyDictionary";
import IPurchaseEvent from "../interfaces/IPurchaseEvent";
import IIAPEvent from "../interfaces/IIAPEvent";
import IReward from "../interfaces/IReward";
import ICurrencyGivenEvent from "../interfaces/ICurrencyGivenEvent";
import { validateRewards } from "./EventValidators";
import IButtonClickedEvent from "../interfaces/IButtonClickedEvent";
import DateHelper from "../utils/DateHelper";

export class EventFactory {
  /************************ Named Event ***********************************************************/
  public getNamedEvent(
    name: string,
    payload: IDictionary<string | number>,
    seqnum: number,
    time: number
  ): INamedEvent {
    return { type: "event", time, seqnum, name, payload };
  }

  /************************ User Update Event ***********************************************************/
  public getUserUpdate(
    attributes: IReadonlyDictionary<string | number | boolean>,
    seqnum: number,
    time: number
  ): IUserUpdateEvent {
    return {
      type: "user",
      time,
      seqnum,
      attributes,
    };
  }

  /************************ User Update with Date Event ***********************************************************/

  public getUserUpdateWithDate(
    keyName: string,
    date: Date,
    seqnum: number,
    time: number
  ): IUserUpdateEvent {
    return {
      type: "user",
      time,
      seqnum,
      attributes: {
        [keyName]: DateHelper.dateToSwrveISOString(date),
      },
    };
  }

  /************************ Device Update Event ***********************************************************/

  public getDeviceUpdate(
    attributes: IReadonlyDictionary<string | number>,
    seqnum: number,
    time: number
  ): IDeviceUpdateEvent {
    return {
      type: "device_update",
      time,
      seqnum,
      attributes,
    };
  }

  /************************ Purchase Event ***********************************************************/

  public getPurchaseEvent(
    keyName: string,
    currency: string,
    cost: number,
    quantity: number,
    seqnum: number,
    time: number
  ): IPurchaseEvent {
    return {
      type: "purchase",
      time,
      seqnum,
      quantity,
      item: keyName,
      cost,
      currency,
    };
  }

  /************************ InAppPurchaseEventWithoutReceipt ***********************************************************/

  public getInAppPurchaseEventWithoutReceipt(
    quantity: number,
    productId: string,
    productPrice: number,
    currency: string,
    seqnum: number,
    time: number,
    rewards?: IReadonlyDictionary<IReward>
  ): IIAPEvent {
    if (rewards != null) {
      validateRewards(rewards);
    }

    return {
      type: "iap",
      time,
      seqnum,
      quantity,
      product_id: productId,
      /* Using a store based on platform, e.g. this.platform.appStore, triggers a receipt check on the backend.
       We are using "unknown_store" to avoid the backend check because the OTT SDK does not support IAPs with receipts. */
      app_store: "unknown_store",
      cost: productPrice,
      local_currency: currency,
      rewards,
    };
  }

  /************************ Session Start Event ***********************************************************/

  public getStartSessionEvent(
    seqnum: number,
    time: number
  ): ISessionStartEvent {
    return {
      type: "session_start",
      time,
      seqnum,
    };
  }

  /************************ Currency Given Event ***********************************************************/

  public getCurrencyGivenEvent(
    given_currency: string,
    given_amount: number,
    seqnum: number,
    time: number
  ): ICurrencyGivenEvent {
    return {
      type: "currency_given",
      time,
      seqnum,
      given_amount,
      given_currency,
    };
  }

  /************************ First Install Event ***********************************************************/

  public getFirstInstallEvent(
    time: number,
    seqnum: number
  ): INamedEvent {
    return {
      type: "event",
      time,
      seqnum,
      name: "Swrve.first_session",
    };
  }

  /************************ Button Click Event ***********************************************************/

  public getButtonClickEvent(
    seqnum: number,
    message: ISwrveBaseMessage,
    name: string,
    embedded: string
  ): IButtonClickedEvent {
    return {
      type: "event",
      time: DateHelper.nowInUtcTime(),
      seqnum,
      name: "Swrve.Messages.Message-" + message.id + ".click",
      payload: {
        name,
        embedded
      },
    };
  }

  public getImpressionEvent(
    message: ISwrveBaseMessage,
    seqnum: number,
    payload?: IDictionary<string | number>
  ): INamedEvent {
    return {
      type: "event",
      time: DateHelper.nowInUtcTime(),
      seqnum,
      name: "Swrve.Messages.Message-" + message.id + ".impression",
      payload,
    };
  }

  public getCampaignTriggeredEvent(
    event_name: string,
    event_payload: object,
    reason: string,
    displayed: string,
    campaigns: IQACampaignTriggerEvent[] = []
  ): IQATriggerReport {
    return {
      event_name,
      event_payload,
      displayed,
      reason,
      campaigns,
    };
  }
}
