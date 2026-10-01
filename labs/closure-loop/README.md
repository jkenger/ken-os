Two bugs, both about what a function remembers.

1. `makeHandlers(["a", "b", "c"])` should return three functions that return `clicked a`, `clicked b` and
   `clicked c`. Today every handler returns the wrong label.
2. `createCounter()` should return a counter with its own count. Today two counters share one count.

Fix both without changing how they are called. For each bug, write one sentence on what the function captured.
