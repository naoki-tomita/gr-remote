import { Observable } from "../Observable";
import { api } from "../../apis";
import { equals } from "../../utils/Equal";

export interface Directory {
  name: string;
  files: File[];
}

export interface File {
  n: string;
  o: number;
  s: "LF";
  d: string;
  thumbnail: string;
  view: string;
  raw: string;
}

type EventTypes = "dirs" | "currentDir" | "currentFile";

export class Storage extends Observable {
  private __dirs: Directory[] = [];
  private __currentDir: Directory | null = null;
  private __currentFile: File | null = null;
  get dirs() {
    return this.__dirs;
  }
  set dirs(param: Directory[]) {
    if (equals(this.__dirs, param)) {
      return;
    }
    this.__dirs = param;
    this.dispatch("dirs");
  }

  get currentDir() {
    return this.__currentDir;
  }
  set currentDir(param: Directory | null) {
    if (equals(this.__currentDir, param)) {
      return;
    }
    this.__currentDir = param;
    this.dispatch("currentDir");
    this.currentFile = null;
  }

  get currentFile() {
    return this.__currentFile;
  }
  set currentFile(param: File | null) {
    if (equals(this.__currentFile, param)) {
      return;
    }
    this.__currentFile = param;
    this.dispatch("currentFile");
  }

  on(type: EventTypes, cb: () => void) {
    super.on(type, cb);
  }

  async fetchList() {
    const result = await api.storage.dirs();
    this.dirs = result.dirs;
    const currentDir = this.currentDir;
    if (
      !currentDir ||
      this.dirs.findIndex(d => currentDir.name === d.name) === -1
    ) {
      this.currentDir = this.dirs[0];
    }
  }
}

export const storage = new Storage();
