import { Observable } from "../Observable";

export class Menu extends Observable {
  private __drawerOpen: boolean = false;
  get drawerOpen() {
    return this.__drawerOpen;
  }
  set drawerOpen(param: boolean) {
    this.__drawerOpen = param;
    this.dispatch("drawerOpen");
  }
}

export const menu = new Menu();
