import { Observable } from "../Observable";
import { equals } from "../../utils/Equal";
import { api } from "../../apis";

export interface DeviceConstants {
  model: string;
  firmwareVersion: string;
  macAddress: string;
  serialNo: string;
  channelList: number[];
}

type EventTypes = "constants";
class Device extends Observable {
  private __constants: DeviceConstants | null = null;
  get constants() {
    return this.__constants;
  }
  set constants(param: DeviceConstants | null) {
    if (equals(this.__constants, param)) {
      return;
    }
    this.__constants = param;
    this.dispatch("constants");
  }

  on(type: EventTypes, cb: () => void) {
    super.on(type, cb);
  }

  async update() {
    const constants = await api.constants.device();
    this.constants = constants;
  }
}

export const device = new Device();
