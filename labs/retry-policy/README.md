Return exponential delays starting at 1000 ms, capped at 30000 ms. Attempts start at zero.

`retryDelay(attempt)` returns how long to wait, in milliseconds, before retry number `attempt`. Attempt 0 waits
1000 ms, and each attempt after it waits twice as long as the one before, never more than 30000 ms.
