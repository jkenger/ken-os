Hand control back between chunks, so a timer gets a turn while the work runs.

`processInChunks(items, handle, chunkSize)` runs `handle` on every item and returns the results in order. Today it
does all the work in one go, so a timer, a click or a render waits until every item is done. Make it stop after each
`chunkSize` items and let other work run before it carries on.

Then write one sentence on why a timer set to 0 ms still waited for the whole list.
