`signUp(db, email)` checks whether the email exists, then inserts it. A double-clicked Sign up button runs it twice at
once, and both calls see "not taken". Emails also differ only in capitals: `Ana@example.com` and `ana@example.com` are
the same person.

Use `migrate(db)` for schema changes; the tests call it once before anything else. Make sure that:

- only one account exists per email, ignoring capitals, however many calls run at once;
- every other call returns `{ ok: false, reason: "taken" }` instead of throwing.

Then explain why the "check first" in the starter can never be enough on its own.
