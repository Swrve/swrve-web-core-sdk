import { IPlatform } from "../interfaces/IPlatform";
import {SwrveCoreSDK} from "../SwrveCoreSDK";

export default class PAL {
  private static platform: IPlatform;

  /**
   * determine the platform and returns Platform object
   */
  public static getPlatform(): IPlatform {
    if (PAL.platform !== undefined) return PAL.platform;

    PAL.platform = SwrveCoreSDK.getPlatform();
    return PAL.platform;
  }
}
