`extractInvoice(callModel, text)` asks a model to pull fields out of an invoice email. `callModel(messages)` sends
chat messages (`{ role, content }`) and returns the reply as a string. The tests use a scripted fake model.

The starter calls `JSON.parse` on the reply and returns whatever comes back. Real replies arrive wrapped in a code
fence or a sentence, with a total written as `"$1,200"`, or with a field missing. Make it:

- Ask for exactly `{ vendor, total, currency, date }` in the first message.
- Read the reply leniently: take the JSON object out of a ```json fence or surrounding text.
- Check it strictly: `vendor` is a non-empty string, `total` a number of at least 0, `currency` three capital letters,
  `date` in `YYYY-MM-DD` form.
- When the reply is unusable, call the model **once more**, adding its reply and a message listing what was wrong.
- Return `{ ok: true, value, attempts }` with only the four fields, or `{ ok: false, errors, attempts }` after the
  second failure.

Then explain what a provider's structured-output mode guarantees, what it doesn't (the values can still be wrong), and
why validation stays in your code either way.
