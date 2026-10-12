The practice endpoint sets five cookies, all valid for 10 minutes unless noted:

| Cookie             | Rule                                     |
| ------------------ | ---------------------------------------- |
| `kos_lab_basic`    | `Path=/`                                 |
| `kos_lab_httponly` | `Path=/; HttpOnly`                       |
| `kos_lab_path`     | `Path=/api/lab/playground/cookies/inner` |
| `kos_lab_expired`  | `Path=/; Max-Age=0`                      |
| `kos_lab_strict`   | `Path=/; SameSite=Strict`                |

Then the check reads `document.cookie`, calls two endpoints that report which cookies arrived, and makes one request
from another site (the code box's isolated worker). Predict each answer first.
