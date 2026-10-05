// React decides whether to re-render by comparing references, not contents: setState with the same object bails out,
// and React.memo skips a child whose props are the same objects. So an update builds new objects along the path to
// what changed (the state, the todos array, the one todo) and reuses everything else. Mutating the old state keeps
// every reference the same, so React sees nothing to do. After a real change React renders (calls your components),
// reconciles (diffs the new elements against the old), then commits only the differences to the DOM.
function addTodo(state, text) {
  return { ...state, todos: [...state.todos, { id: state.nextId, text, done: false }], nextId: state.nextId + 1 };
}

function updateTodo(state, id, change) {
  if (!state.todos.some((todo) => todo.id === id)) return state;
  return { ...state, todos: state.todos.map((todo) => (todo.id === id ? change(todo) : todo)) };
}

function toggleTodo(state, id) {
  return updateTodo(state, id, (todo) => ({ ...todo, done: !todo.done }));
}

function renameTodo(state, id, text) {
  return updateTodo(state, id, (todo) => ({ ...todo, text }));
}
