Turn any thrown error into one predictable response, without leaking internals.

`toErrorResponse(error)` runs when an API handler throws. It returns `{ status, body }`. Today it sends every error as a
500 with the raw message and the stack trace, so clients can't tell a typo from an outage, and a database error can
show its connection string to anyone.

Every body must be `{ error: { code, message } }`, plus `fields` for validation errors:

| `error.name`      | Status | `code`          | `message`                                                               |
| ----------------- | ------ | --------------- | ----------------------------------------------------------------------- |
| `ValidationError` | 400    | `invalid_input` | the error's message; `fields` maps each issue's `path` to its `message` |
| `NotFoundError`   | 404    | `not_found`     | the error's message                                                     |
| `ConflictError`   | 409    | `conflict`      | the error's message                                                     |
| anything else     | 500    | `internal`      | `Something went wrong`                                                  |

Then write one sentence on why a client should branch on `code` rather than on `message`.
