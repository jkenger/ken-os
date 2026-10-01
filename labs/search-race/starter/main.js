function createSearch(fetchResults, onResults) {
  return function search(query) {
    fetchResults(query).then(onResults);
  };
}
