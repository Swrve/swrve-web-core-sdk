import {
  SWRVE_INSTALL_DATE,
} from "./SwrveConstants";
import { IPlatform } from "../interfaces/IPlatform";
import IDictionary from "../interfaces/IDictionary";

export function queryDeviceProperties(
  platform: IPlatform,
  installDate: string
): IDictionary<string | number> {
  const deviceProperties: IDictionary<string | number> = {
    ...platform.getDeviceProperties(),
    [SWRVE_INSTALL_DATE]: installDate
  };

  return deviceProperties;
}
