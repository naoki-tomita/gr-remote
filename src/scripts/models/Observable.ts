export class Observable {
  map: { [key: string]: Array<() => void> } = {};
  on(key: string, cb: () => void) {
    this.map[key] = [...(this.map[key] || []), cb];
  }
  dispatch(key: string) {
    (this.map[key] || []).forEach(cb => cb());
  }
}
