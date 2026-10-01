// var creates one i for the whole function, so every handler closed over the same variable, which equals
// labels.length by the time any handler runs. let creates a new binding for each loop iteration.
function makeHandlers(labels) {
  const handlers = [];
  for (let i = 0; i < labels.length; i++) {
    handlers.push(() => "clicked " + labels[i]);
  }
  return handlers;
}

// The count lived outside createCounter, so every counter closed over the same variable.
// Declaring it inside gives each call its own scope.
function createCounter() {
  let count = 0;
  return {
    increment() {
      count += 1;
      return count;
    },
    read() {
      return count;
    },
  };
}
