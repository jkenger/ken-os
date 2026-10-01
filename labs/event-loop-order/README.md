A form submit handler logs four steps. The screen has to update right away, so `button disabled` and
`spinner shown` must be logged synchronously. Then the form must be `validated`, and only after that `saved`.

Right now `saved` is logged before `validated`. Fix `submitForm` so the order is:

1. `button disabled`
2. `spinner shown`
3. `validated`
4. `saved`

Keep validation and saving asynchronous: right after `submitForm` returns, only the first two lines may have been logged.
Before you change anything, write down why the current code logs `saved` first.
