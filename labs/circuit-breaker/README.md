The recommendations service is down. Every product page still calls it, waits, fails, and shows an error, while the
pile of waiting calls makes the service slower to come back. Write a circuit breaker.

`createBreaker(fn, { failureThreshold = 3, cooldownMs = 10000, now })` returns `{ call(...args), state() }`:

- **Closed** (normal): `call` runs `fn`. A success resets the failure count. After `failureThreshold` failures in a
  row, the breaker opens.
- **Open**: `call` throws at once, without running `fn`, with an error whose `name` is `BreakerOpenError`.
- **Half-open**: once `cooldownMs` has passed since it opened, the next `call` is let through as a trial. If it
  succeeds the breaker closes; if it fails the breaker opens again for another cooldown.
- `state()` returns `"closed"`, `"open"` or `"half-open"`.

Use `now()` for the time; the tests move a fake clock. Then write `recommendationsFor(breaker, userId, popular)`, which
returns the breaker's result, or the `popular` list whenever the call fails, so the page still shows something.

Then explain what users should see while the breaker is open, and why failing fast helps the failing service recover.
