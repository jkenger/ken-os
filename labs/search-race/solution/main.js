// Each search gets its own AbortController. Starting a new search aborts the previous one, and the
// latest-controller check ignores anything that still slips through. Abort errors are expected and dropped.
function createSearch(fetchResults, onResults) {
  let current = null;
  return function search(query) {
    current?.abort();
    const controller = new AbortController();
    current = controller;
    fetchResults(query, controller.signal)
      .then((results) => {
        if (current === controller) onResults(results);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") throw error;
      });
  };
}
