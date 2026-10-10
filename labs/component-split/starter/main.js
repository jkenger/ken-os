function createSearchPage(items) {
  const filterBox = {
    query: "",
    type(text) { this.query = text; },
    value() { return this.query; },
  };
  const resultList = {
    query: "",
    items: [...items],
    visible() {
      return this.items.filter((item) => item.toLowerCase().includes(this.query.toLowerCase()));
    },
  };
  let shownCount = items.length;
  return {
    filterBox,
    resultList,
    addItem(item) { resultList.items.push(item); },
    summary() { return `${shownCount} of ${resultList.items.length}`; },
  };
}
