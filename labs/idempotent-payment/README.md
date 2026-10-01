A phone on a bad connection retries `POST /payments` until it gets an answer. Each retry carries the same
`idempotencyKey`, which the client generated once for this payment. Today every retry creates another payment.

Make `createPayment(db, { idempotencyKey, amount })` safe to call any number of times, including all at once:

- one key creates exactly one payment row;
- every call with that key returns the same payment;
- reusing a key with a different amount rejects, because that is a client bug, not a retry.

Use `migrate(db)` for schema changes.
