`createSearch(fetchResults, onResults)` returns a `search(query)` function for a search box. Each keystroke calls
`search` with the new text. Responses can come back in any order, so today a slow old response can replace the
results of a newer query.

`fetchResults(query, signal)` returns a promise of results and rejects with an `AbortError` if `signal` is aborted.

Make it so that:

- `onResults` only ever receives results for the latest query;
- starting a new search aborts the request still in flight;
- an aborted request never calls `onResults` and never causes an unhandled rejection.

Then explain why `useCallback` would not have fixed this in a React version.
