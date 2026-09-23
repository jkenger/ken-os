# Scope a vertical slice

Use this when starting a new product or a genuinely new module.

- Name the recurring task, current workaround, and cost of that workaround in the user's terms.
- Write one first-user outcome that can be demonstrated from start to finish. Keep the artifact or workflow's source of truth explicit.
- Include the minimum permissions, persistence, and failure/recovery paths needed for that outcome. A polished empty shell is not the slice.
- State exclusions and later candidates separately. Do not promote possible modules into MVP commitments without a recurring workflow to justify them.
- Write observable acceptance criteria: what survives restart/redeploy, what updates, what happens when an external file or service is unavailable, and how access is constrained.
- When the user says "hosted," include a reachable public URL and a production smoke test in the completion bar. Local success is an intermediate milestone.

If an external provider owns the artifact, identify the stable reference to persist and the conditions for refreshing it. Avoid treating a filename or other mutable label as identity.
