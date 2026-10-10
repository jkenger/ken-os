// The box and the list both need the search text, so it lives once, in their closest common parent: the page. Each
// part reads it from there instead of keeping a copy that can drift. The count can always be computed from the text and
// the items, so it isn't stored at all; a stored copy is one more thing to forget to update.
function createSearchPage(items) {
  const state = { query: "", items: [...items] };
  const visible = () => state.items.filter((item) => item.toLowerCase().includes(state.query.toLowerCase()));
  return {
    filterBox: {
      type(text) { state.query = text; },
      value() { return state.query; },
    },
    resultList: { visible },
    addItem(item) { state.items.push(item); },
    summary() { return `${visible().length} of ${state.items.length}`; },
  };
}
