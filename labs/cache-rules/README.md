The check fetches the same URL twice for each of three caching policies and reads the browser's own timing data to
see what the second request did. Each response body is about 20 KB, so a full download is easy to spot.

| Policy   | Response headers                                  |
| -------- | ------------------------------------------------- |
| max-age  | `Cache-Control: private, max-age=120`             |
| no-cache | `Cache-Control: private, no-cache` plus an `ETag` |
| no-store | `Cache-Control: no-store`                         |

Turn off "Disable cache" in DevTools before running, or every answer will be "reaches the server". This is the
browser's cache only. A CDN or server cache in front of Ken OS would be a separate layer with its own rules.
