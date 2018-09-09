import { Observable } from "../Observable";
import { api } from "../../apis";
import { equals } from "../../utils/Equal";

export enum FocusModeTypes {
  AUTO = "AUTO",
  MANUAL = "MANUAL",
}

type EventTypes = "mode";

export class Shutter extends Observable {
  private __mode: FocusModeTypes = FocusModeTypes.AUTO;
  get mode() {
    return this.__mode;
  }
  set mode(param: FocusModeTypes) {
    if (equals(this.__mode, param)) {
      return;
    }
    this.__mode = param;
    this.dispatch("mode");
  }

  on(type: EventTypes, cb: () => void) {
    super.on(type, cb);
  }

  async shoot() {
    if (this.mode === FocusModeTypes.AUTO) {
      await api.focus.lock();
    }
    await api.photo.shoot(true);
    await api.focus.unlock();
  }
}

export const shutter = new Shutter();
