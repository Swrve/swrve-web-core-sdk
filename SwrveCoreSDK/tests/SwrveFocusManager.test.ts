import SwrveFocusManager from "../src/UIElements/SwrveFocusManager";

describe("SwrveFocusManager", () => {
  it("cycles through items", () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const options = {
      onFocus,
      onBlur,
    };
    const manager = new SwrveFocusManager<string>(["a", "b", "c"], {
      direction: "horizontal",
      ...options,
    });

    manager.onKeyPress("Right");
    expect(manager.getCurrentIndex()).toBe(1);

    manager.onKeyPress("Right");
    expect(manager.getCurrentIndex()).toBe(2);

    manager.onKeyPress("Left");
    expect(manager.getCurrentIndex()).toBe(1);

    manager.onKeyPress("Left");
    expect(manager.getCurrentIndex()).toBe(0);

    // check the record of onBlur and onFocus calls to verify the transitions
    expect(onBlur.mock.calls).toEqual([["a"], ["b"], ["c"], ["b"]]);
    expect(onFocus.mock.calls).toEqual([["b"], ["c"], ["b"], ["a"]]);
  });

  it("cycles vertical direction menu", () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const options = {
      onFocus,
      onBlur,
    };
    const manager = new SwrveFocusManager<string>(["a", "b", "c"], options);

    manager.onKeyPress("Down");
    expect(manager.getCurrentIndex()).toBe(1);

    manager.onKeyPress("Down");
    expect(manager.getCurrentIndex()).toBe(2);

    manager.onKeyPress("Up");
    expect(manager.getCurrentIndex()).toBe(1);

    manager.onKeyPress("Up");
    expect(manager.getCurrentIndex()).toBe(0);

    expect(onFocus.mock.calls).toEqual([["b"], ["c"], ["b"], ["a"]]);
    expect(onBlur.mock.calls).toEqual([["a"], ["b"], ["c"], ["b"]]);
  });

  it("cycles bidirectional menu", () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const options = {
      onFocus,
      onBlur,
    };
    const manager = new SwrveFocusManager<string>(["a", "b", "c"], {
      direction: "bidirectional",
      ...options,
    });

    manager.onKeyPress("Down");
    expect(manager.getCurrentIndex()).toBe(1);

    manager.onKeyPress("Right");
    expect(manager.getCurrentIndex()).toBe(2);

    manager.onKeyPress("Left");
    expect(manager.getCurrentIndex()).toBe(1);

    manager.onKeyPress("Up");
    expect(manager.getCurrentIndex()).toBe(0);

    expect(onFocus.mock.calls).toEqual([["b"], ["c"], ["b"], ["a"]]);
    expect(onBlur.mock.calls).toEqual([["a"], ["b"], ["c"], ["b"]]);
  });

  it("cannot overrun at the end", () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const options = {
      onFocus,
      onBlur,
    };

    const manager = new SwrveFocusManager<string>(["a", "b", "c"], options);

    manager.setActiveLast();
    expect(manager.getCurrentIndex()).toBe(2);
    expect(manager.getItems()[manager.getCurrentIndex()]).toBe("c");

    jest.resetAllMocks();

    manager.onKeyPress("Down");
    expect(manager.getCurrentIndex()).toBe(2);
    expect(manager.getItems()[manager.getCurrentIndex()]).toBe("c");

    expect(onFocus).not.toBeCalled;
    expect(onBlur).not.toBeCalled;
  });

  it("cannot overrun at the beginning", () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();

    const options = {
      onFocus,
      onBlur,
    };

    const manager = new SwrveFocusManager<string>(["a", "b", "c"], options);

    manager.setActiveFirst();
    expect(manager.getCurrentIndex()).toBe(0);
    expect(manager.getItems()[manager.getCurrentIndex()]).toBe("a");

    jest.resetAllMocks();

    manager.onKeyPress("Up");
    expect(manager.getCurrentIndex()).toBe(0);
    expect(manager.getItems()[manager.getCurrentIndex()]).toBe("a");

    expect(onFocus).not.toBeCalled;
    expect(onBlur).not.toBeCalled;
  });

  it("delegates keypress to children", () => {
    const manager = new SwrveFocusManager<string>(["a", "b", "c"], {
      onFocus: () => {},
      onBlur: () => {},
      onKeyPress: () => true,
      direction: "bidirectional",
    });

    expect(manager.getCurrentIndex()).toBe(0);

    manager.onKeyPress("Down");
    expect(manager.getCurrentIndex()).toBe(0);
  });

  it("handles nested menus", () => {
    const manager1 = new SwrveFocusManager<string>(["a", "b", "c"], {
      onFocus: () => {},
      onBlur: () => {},
    });
    const manager2 = new SwrveFocusManager<string>(["d", "e", "f"], {
      onFocus: () => {},
      onBlur: () => {},
    });
    const topManager = new SwrveFocusManager<SwrveFocusManager<string>>(
      [manager1, manager2],
      {
        onFocus: (item) => item.onBlur(),
        onBlur: (item) => item.onBlur(),
        onKeyPress: (item, key) => item.onKeyPress(key),
        direction: "horizontal",
      }
    );

    expect(topManager.getCurrentIndex()).toBe(0);
    expect(manager1.getCurrentIndex()).toBe(0);
    expect(manager2.getCurrentIndex()).toBe(0);

    topManager.onKeyPress("Down");
    expect(topManager.getCurrentIndex()).toBe(0);
    expect(manager1.getCurrentIndex()).toBe(1);
    expect(manager2.getCurrentIndex()).toBe(0);

    topManager.onKeyPress("Right");
    expect(topManager.getCurrentIndex()).toBe(1);
    expect(manager1.getCurrentIndex()).toBe(1);
    expect(manager2.getCurrentIndex()).toBe(0);

    topManager.onKeyPress("Down");
    topManager.onKeyPress("Down");
    expect(topManager.getCurrentIndex()).toBe(1);
    expect(manager1.getCurrentIndex()).toBe(1);
    expect(manager2.getCurrentIndex()).toBe(2);
  });

  it("handles getters and setters", () => {
    const manager = new SwrveFocusManager<string>(["a", "b", "c"], {
      onFocus: () => {},
      onBlur: () => {},
    });

    expect(manager.getItems()[manager.getCurrentIndex()]).toBe("a");

    manager.setItems(["d", "e", "f"]);
    expect(manager.getItems()[manager.getCurrentIndex()]).toBe("d");
  });

  it("handles onFocus and onBlur", () => {
    const onFocus = jest.fn();
    const onBlur = jest.fn();
    const manager = new SwrveFocusManager<string>(["a", "b", "c"], {
      onFocus,
      onBlur,
    });

    expect(onFocus).not.toBeCalled;
    expect(onBlur).not.toBeCalled;

    manager.onFocus();
    expect(onFocus.mock.calls[0][0]).toBe("a");
    expect(onBlur).not.toBeCalled;

    manager.onBlur();
    expect(onFocus).toBeCalledTimes(1);
    expect(onBlur.mock.calls[0][0]).toBe("a");

    manager.setItems([]);
    manager.onFocus();
    manager.onBlur();
    expect(onFocus).toBeCalledTimes(1);
    expect(onBlur).toBeCalledTimes(1);
  });
});
