// A pricing service whose answers we control, one pending call at a time.
function pricingService() {
  const service = { calls: 0, pending: [], price: 100 };
  service.load = (key) => {
    service.calls += 1;
    return new Promise((resolve, reject) => service.pending.push({ key, resolve, reject, price: service.price }));
  };
  service.finish = () => { const call = service.pending.shift(); call.resolve(call.price); };
  service.fail = () => service.pending.shift().reject(new Error("pricing unavailable"));
  return service;
}
function clock() { let time = 0; return { now: () => time, advance: (ms) => { time += ms; } }; }
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

test("a fresh value is served without calling the service", async () => {
  const service = pricingService();
  const time = clock();
  const cache = createCache({ load: service.load, ttlMs: 1000, now: time.now });
  const first = cache.get("sku-1"); await settle(); service.finish();
  assert.equal(await first, 100);
  time.advance(999);
  assert.equal(await cache.get("sku-1"), 100);
  assert.equal(service.calls, 1);
});

test("an expired value is loaded again", async () => {
  const service = pricingService();
  const time = clock();
  const cache = createCache({ load: service.load, ttlMs: 1000, now: time.now });
  const first = cache.get("sku-1"); await settle(); service.finish(); await first;
  time.advance(1000);
  service.price = 120;
  const second = cache.get("sku-1"); await settle();
  assert.equal(service.calls, 2, "a value as old as the TTL is stale");
  service.finish();
  assert.equal(await second, 120);
});

test("a hundred callers on a cold key cause one load", async () => {
  const service = pricingService();
  const cache = createCache({ load: service.load, ttlMs: 1000, now: clock().now });
  const waiting = Array.from({ length: 100 }, () => cache.get("hot"));
  await settle();
  assert.equal(service.calls, 1, "callers waiting on the same key share one load");
  service.finish();
  const results = await Promise.all(waiting);
  assert.ok(results.every((price) => price === 100));
});

test("a failed load isn't cached", async () => {
  const service = pricingService();
  const cache = createCache({ load: service.load, ttlMs: 1000, now: clock().now });
  const first = cache.get("sku-1"); await settle(); service.fail();
  await assert.rejects(first);
  const second = cache.get("sku-1"); await settle();
  assert.equal(service.calls, 2, "the next caller tries again");
  service.finish();
  assert.equal(await second, 100);
});

test("invalidating during a load stops that stale result from being cached", async () => {
  const service = pricingService();
  const cache = createCache({ load: service.load, ttlMs: 60000, now: clock().now });
  const reading = cache.get("sku-1"); await settle();
  service.price = 150;
  cache.invalidate("sku-1");
  service.pending[0].price = 100;
  service.finish();
  await reading;
  const fresh = cache.get("sku-1"); await settle();
  assert.equal(service.calls, 2, "the value loaded before the write must not be served after it");
  service.finish();
  assert.equal(await fresh, 150);
});
