`parseOrder(body)` receives the JSON body of a "create order" request. A TypeScript type on the handler would not
help here: types are erased before the code runs, and the body came from someone else's computer.

Make `parseOrder` return `{ ok: true, value }` or `{ ok: false, errors }`:

- `value` has exactly `email`, `sku`, `quantity` and `note`, and nothing else from the body.
- `email`: a string with text on both sides of an `@`. Trim it and lower-case it.
- `sku`: a string like `ABC-1234` (three capital letters, a dash, four digits).
- `quantity`: a whole number from 1 to 100. The string `"3"` is not a number.
- `note`: optional. A string of at most 200 characters, or `null` when it's missing.
- `errors` lists every problem at once, each as `{ path, message }`, where `path` is the field name, or `"body"`
  when the body isn't an object.

```js
parseOrder({ email: " Ken@Example.com ", sku: "ABC-1234", quantity: 3, isAdmin: true });
// → { ok: true, value: { email: "ken@example.com", sku: "ABC-1234", quantity: 3, note: null } }
parseOrder({ email: "ken@example.com", sku: "ABC-1234", quantity: "3" }).errors.map((error) => error.path);
// → ["quantity"]
```

Then explain why a `price` or `isAdmin` field in the body must never reach the database, even if the type says it
isn't there.
