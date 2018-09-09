import { Observable } from "../Observable";
import { equals } from "../../utils/Equal";
type EventTypes = "drawerOpen";
class Menu extends Observable {
  private __drawerOpen: boolean = false;
  get drawerOpen() {
    return this.__drawerOpen;
  }
  set drawerOpen(param: boolean) {
    if (equals(this.__drawerOpen, param)) {
      return;
    }
    this.__drawerOpen = param;
    this.dispatch("drawerOpen");
  }

  on(type: EventTypes, cb: () => void) {
    super.on(type, cb);
  }
}

export const menu = new Menu();
