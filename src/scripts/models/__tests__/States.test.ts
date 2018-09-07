import { onUpdate, state } from "../States";

describe("States", () => {
  it("should wrapped state", () => {
    const spy1 = jest.fn();
    const spy2 = jest.fn();
    onUpdate(["foo"], spy1);
    onUpdate(["drawerOpen"], spy2);
    state.drawerOpen = true;
    state.foo = { bar: "xxx" };
    expect(spy1.mock.calls.length).toBe(1);
    expect(spy2.mock.calls.length).toBe(1);
    expect(state.drawerOpen).toBe(true);
    expect(state.foo.bar).toBe("xxx");
  });
});
