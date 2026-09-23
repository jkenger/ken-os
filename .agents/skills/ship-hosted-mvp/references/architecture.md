# Architecture for a hosted first slice

Decide boundaries after the user outcome and stack are clear.

- Start with one deployable app. Organize by feature and keep its UI, use cases, and data access easy to trace. A typical path is UI → thin route/server action → use case → database or external-service adapter. Domain rules should not depend on transport or persistence details.
- Keep database schema/migrations, authentication, and shared UI foundations in explicit app-level locations. Extract a package only when another deployable or a genuinely independent consumer needs it; folder boundaries are enough before then.
- Define source of truth for each datum. Keep provider-owned content at the provider unless copying it is part of the user outcome; persist stable IDs, ownership, status, and metadata needed to resume work.
- Draw the trust boundary around sign-in, sessions, secrets, external tokens, and agent tools. Give each agent only the data and tools its job needs. Require an explicit approval path before external writes.
- Make migrations repeatable for local and hosted databases. When adopting an ORM over existing handwritten SQL, baseline the live schema rather than replaying conflicting table creation.
- Cover local and production configuration separately: database URL, OAuth redirects and origins, API-key restrictions, encryption keys, and secret storage. Never infer that a successful build proves external integration works.
- Check host, database, domain, OAuth, and other external prerequisites early. Keep hosting-specific configuration at the edge rather than in domain rules. Verify the key user path on the actual hosted URL and record what still needs owner-provided credentials or configuration.
