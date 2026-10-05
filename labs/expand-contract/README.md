`users.fullname` should become `users.display_name`. During a deploy, the old version of the app (which reads and
writes `fullname`) and the new one (which uses `display_name`) run side by side for a while. The starter renames the
column in one step, and every request still on the old version fails until the deploy finishes.

Do it in two steps that are each safe while both versions run:

- `expand(db)`: add `display_name`, copy the existing names into it, and keep the two columns in step for every
  insert and update, from either version, with a trigger.
- `contract(db)`, run once no old version is left: remove the trigger and `fullname`, and make `display_name`
  required.

Also write `createUser(db, name)` and `renameUser(db, id, name)` for the new version: they use only `display_name`.

The old version's code is in the tests (`oldCreateUser`, `oldRename`). Then explain the order of steps for adding a
required column, and why "rename in one migration" breaks a zero-downtime deploy.
