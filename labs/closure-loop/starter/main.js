function makeHandlers(labels) {
  var handlers = [];
  for (var i = 0; i < labels.length; i++) {
    handlers.push(function () {
      return "clicked " + labels[i];
    });
  }
  return handlers;
}

let count = 0;

function createCounter() {
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
