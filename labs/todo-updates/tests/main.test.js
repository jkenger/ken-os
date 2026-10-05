// A stand-in for React: re-render when the state object changes, and re-render a memoized row when its todo changes.
function createApp(initial) {
  let state = initial;
  let renders = 0;
  const rowRenders = new Map();
  const lastSeen = new Map();
  function render() {
    renders += 1;
    for (const todo of state.todos) {
      if (lastSeen.get(todo.id) !== todo) {
        rowRenders.set(todo.id, (rowRenders.get(todo.id) ?? 0) + 1);
        lastSeen.set(todo.id, todo);
      }
    }
  }
  render();
  return {
    update(fn, ...args) {
      const next = fn(state, ...args);
      if (!Object.is(next, state)) { state = next; render(); }
    },
    get state() { return state; },
    get renders() { return renders; },
    rowRenders,
  };
}

function deepFreeze(value) {
  if (value && typeof value === "object") { Object.values(value).forEach(deepFreeze); Object.freeze(value); }
  return value;
}

const start = () => deepFreeze({ todos: [{ id: 1, text: "Buy milk", done: false }, { id: 2, text: "Write tests", done: true }], nextId: 3 });

test("adding a todo re-renders the app and only the new row", () => {
  const app = createApp(start());
  app.update(addTodo, "Call Ana");
  assert.equal(app.renders, 2, "the app should re-render once");
  assert.deepEqual(app.state.todos.map((todo) => todo.text), ["Buy milk", "Write tests", "Call Ana"]);
  assert.equal(app.state.nextId, 4);
  assert.deepEqual([...app.rowRenders.values()], [1, 1, 1], "only the new row renders; the old rows stay as they were");
});

test("toggling re-renders exactly that row", () => {
  const app = createApp(start());
  app.update(toggleTodo, 1);
  assert.equal(app.renders, 2);
  assert.equal(app.state.todos[0].done, true);
  assert.equal(app.rowRenders.get(1), 2, "the toggled row re-renders");
  assert.equal(app.rowRenders.get(2), 1, "the other row keeps its object, so it doesn't");
  app.update(toggleTodo, 1);
  assert.equal(app.state.todos[0].done, false);
});

test("renaming re-renders exactly that row", () => {
  const app = createApp(start());
  app.update(renameTodo, 2, "Write more tests");
  assert.equal(app.state.todos[1].text, "Write more tests");
  assert.equal(app.rowRenders.get(2), 2);
  assert.equal(app.rowRenders.get(1), 1);
});

test("the old state is never changed", () => {
  const before = start();
  const app = createApp(before);
  app.update(addTodo, "x");
  app.update(toggleTodo, 2);
  assert.equal(before.todos.length, 2);
  assert.equal(before.todos[1].done, true);
  assert.equal(before.nextId, 3);
});

test("an unknown id changes nothing and renders nothing", () => {
  const app = createApp(start());
  app.update(toggleTodo, 99);
  app.update(renameTodo, 99, "nope");
  assert.equal(app.renders, 1);
});
