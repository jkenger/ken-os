A team app keeps documents per organisation. People join organisations as a `viewer`, `editor` or `admin`:

| User    | Acme (org 1) | Globex (org 2) |
| ------- | ------------ | -------------- |
| Ana (1) | editor       |                |
| Ben (2) | viewer       |                |
| Cy (3)  |              | admin          |
| Dee (4) |              |                |

Acme has documents 1 and 2; Globex has document 3. `actor` is the signed-in user, `{ userId }`, or `null`.

The starter only checks that someone is signed in. Anyone can read any document by guessing its id, list any
organisation's documents, and a viewer can edit. Fix the three functions:

- `getDocument(db, actor, docId)`: the document, or `null` when it doesn't exist or the actor isn't a member of its
  organisation. Both cases must look the same, so an outsider can't learn which ids exist.
- `listDocuments(db, actor, orgId)`: that organisation's documents in id order, or `[]` for a non-member.
- `updateDocument(db, actor, docId, { title, body })`: editors and admins may change title and body. A viewer gets an
  error whose message includes `forbidden`. A non-member gets `null`, as if the document didn't exist.

All three throw an error mentioning `sign in` when `actor` is `null`. Check membership in the database on every call,
so a removed member loses access at once.

```js
const ana = { userId: 1 };
(await getDocument(db, ana, 1)).title;
// → "Roadmap"
await getDocument(db, ana, 3);
// → null
(await listDocuments(db, ana, 1)).map((doc) => doc.title);
// → ["Roadmap", "Pricing"]
```

Then explain the difference between who someone is (authentication) and what they may touch (authorization), and why
the membership check belongs in the same query as the read or write.
