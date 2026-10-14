A todo list keeps its state as `{ todos: [{ id, text, done }], nextId }`. The tests run your update functions inside a
small stand-in for React that behaves the way React does:

- After an update, the app re-renders only if the new state is a different object (`Object.is`), the way
  `setState` bails out on the same value.
- Each row is memoized, like `React.memo`: it re-renders only when its todo object is a different object.

Write three update functions. Each returns the next state and never changes the one it was given:

- `addTodo(state, text)` adds `{ id: state.nextId, text, done: false }` at the end and increases `nextId`.
- `toggleTodo(state, id)` flips `done` on that todo.
- `renameTodo(state, id, text)` changes that todo's `text`.

```js
const state = { todos: [{ id: 1, text: "Buy milk", done: false }], nextId: 2 };
addTodo(state, "Call Ana");
// → { todos: [{ id: 1, text: "Buy milk", done: false }, { id: 2, text: "Call Ana", done: false }], nextId: 3 }
toggleTodo(state, 99) === state;
// → true
```

Todos you don't change must stay the very same objects, so their rows don't re-render. When the id doesn't exist,
return the state you were given, so nothing re-renders.

Then explain what happens between your update and the screen changing: render, reconciliation, commit, and why
mutating the old state means React may never notice.
