function addTodo(state, text) {
  state.todos.push({ id: state.nextId, text, done: false });
  state.nextId += 1;
  return state;
}

function toggleTodo(state, id) {
  const todo = state.todos.find((item) => item.id === id);
  if (todo) todo.done = !todo.done;
  return state;
}

function renameTodo(state, id, text) {
  const todo = state.todos.find((item) => item.id === id);
  if (todo) todo.text = text;
  return state;
}
