The code box runs in an isolated worker whose origin is `null`, so to Ken OS it is another site. The check sends six
requests from there to a practice endpoint, each answered with a different CORS policy, and records whether the
calling code could read the response.

| Variant | Server sends |
|---|---|
| none | no CORS headers |
| star | `Access-Control-Allow-Origin: *` |
| star-credentials | `*` plus `Allow-Credentials: true`; request uses `credentials: "include"` |
| echo-credentials | the caller's origin plus `Allow-Credentials: true`; request uses `credentials: "include"` |
| preflight-denied | the caller's origin; request adds an `X-Lab-Token` header, which the preflight doesn't allow |
| preflight-allowed | the same, but the preflight allows `X-Lab-Token` |

Before you start, write down who enforces CORS: the server, the browser, or both.
