let events = [];
function createConnection(serverUrl, roomId) {
  return {
    connect() {
      events.push(`connect ${roomId} @ ${serverUrl}`);
    },
    disconnect() {
      events.push(`disconnect ${roomId} @ ${serverUrl}`);
    },
  };
}

// A stand-in for React's useEffect: run after render when a dependency changed, clean up the previous run first,
// and clean up everything on unmount.
function mount(Component, props) {
  let slots = [];
  let index = 0;
  let pending = [];
  function useEffect(setup, deps) {
    const slot = index++;
    const previous = slots[slot];
    const changed =
      !previous ||
      !deps ||
      !previous.deps ||
      deps.length !== previous.deps.length ||
      deps.some((dep, i) => !Object.is(dep, previous.deps[i]));
    if (!changed) return;
    pending.push(() => {
      if (previous && previous.cleanup) previous.cleanup();
      const cleanup = setup();
      slots[slot] = { deps, cleanup: typeof cleanup === "function" ? cleanup : null };
    });
  }
  function render(nextProps) {
    index = 0;
    pending = [];
    Component(nextProps, { useEffect });
    pending.forEach((run) => run());
  }
  render(props);
  return {
    rerender: render,
    unmount() {
      slots.forEach((slot) => slot && slot.cleanup && slot.cleanup());
      slots = [];
    },
  };
}

const general = { roomId: "general", serverUrl: "https://a.chat" };

test("mounting connects to the room", () => {
  events = [];
  mount(ChatRoom, general);
  assert.deepEqual(events, ["connect general @ https://a.chat"]);
});

test("re-rendering with the same room does nothing", () => {
  events = [];
  const room = mount(ChatRoom, general);
  room.rerender({ ...general });
  room.rerender({ ...general });
  assert.deepEqual(events, ["connect general @ https://a.chat"]);
});

test("changing the room leaves the old one, then joins the new one", () => {
  events = [];
  const room = mount(ChatRoom, general);
  room.rerender({ ...general, roomId: "music" });
  assert.deepEqual(events, [
    "connect general @ https://a.chat",
    "disconnect general @ https://a.chat",
    "connect music @ https://a.chat",
  ]);
});

test("changing the server reconnects too", () => {
  events = [];
  const room = mount(ChatRoom, general);
  room.rerender({ ...general, serverUrl: "https://b.chat" });
  assert.deepEqual(events.slice(1), ["disconnect general @ https://a.chat", "connect general @ https://b.chat"]);
});

test("unmounting disconnects", () => {
  events = [];
  const room = mount(ChatRoom, general);
  room.rerender({ ...general, roomId: "music" });
  events = [];
  room.unmount();
  assert.deepEqual(events, ["disconnect music @ https://a.chat"]);
});
