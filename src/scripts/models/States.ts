export interface State {
  drawerOpen: boolean;
  foo: {
    bar: string;
  };
}

export const InitialState: State = {
  drawerOpen: false,
  foo: {
    bar: "text",
  },
};

const __state: State = InitialState;

const cbs: any = {};

export function onUpdate(keys: string[], cb: (value: any) => void) {
  let tmp = cbs;
  keys.forEach(key => {
    tmp[key] = tmp[key] || {};
    tmp = tmp[key];
  });
  tmp.__base = [...(tmp.__base || []), cb];
}

function subscribe(tmp: null | { __base: null | Array<() => void> }) {
  if (tmp && tmp.__base) {
    tmp.__base.forEach(cb => cb());
  }
}

function update(keys: string[]) {
  let tmp = cbs;
  keys.forEach(key => {
    tmp[key] = tmp[key] || {};
    tmp = tmp[key];
  });
  subscribe(tmp);
}

function wrap(x: any): any {
  const dst = {};
  Object.keys(x).forEach(key => {
    Object.defineProperty(dst, key, {
      get: () => x[key],
      set: y => (update([key]), (x[key] = y)),
    });
  });
  return dst;
}

export const state: State = wrap(__state);
