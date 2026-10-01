function fakeFetch(delays) {
  const signals = {};
  const fetchResults = (query, signal) => {
    signals[query] = signal;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve([`${query}-result`]), delays[query] ?? 5);
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      });
    });
  };
  return { fetchResults, signals };
}

test("a slow old response never replaces newer results", async () => {
  const { fetchResults } = fakeFetch({ a: 60, ab: 10 });
  const received = [];
  const search = createSearch(fetchResults, (results) => received.push(results));
  search("a");
  search("ab");
  await wait(120);
  assert.deepEqual(received, [["ab-result"]]);
});

test("starting a new search aborts the one in flight", async () => {
  const { fetchResults, signals } = fakeFetch({ a: 60, ab: 10 });
  const search = createSearch(fetchResults, () => {});
  search("a");
  search("ab");
  await wait(80);
  assert.ok(signals.a, "fetchResults must be given a signal");
  assert.equal(signals.a.aborted, true);
  assert.equal(signals.ab.aborted, false);
});

test("searches that don't overlap all deliver results", async () => {
  const { fetchResults } = fakeFetch({ a: 5, ab: 5 });
  const received = [];
  const search = createSearch(fetchResults, (results) => received.push(results));
  search("a");
  await wait(30);
  search("ab");
  await wait(30);
  assert.deepEqual(received, [["a-result"], ["ab-result"]]);
});

test("no unhandled rejection when a search is aborted", async () => {
  const { fetchResults } = fakeFetch({ a: 40, ab: 5 });
  const search = createSearch(fetchResults, () => {});
  search("a");
  search("ab");
  await wait(60);
  assert.equal(unhandledRejections(), 0);
});
