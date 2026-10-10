const fruit = () => createSearchPage(["Apple", "Banana", "Grape", "Cherry", "Mango"]);

test("typing in the box filters the list", () => {
  const page = fruit();
  page.filterBox.type("ap");
  assert.deepEqual(page.resultList.visible(), ["Apple", "Grape"]);
});

test("the box shows what was typed", () => {
  const page = fruit();
  page.filterBox.type("an");
  assert.equal(page.filterBox.value(), "an");
});

test("the summary matches what the list shows", () => {
  const page = fruit();
  page.filterBox.type("ap");
  assert.equal(page.summary(), "2 of 5");
});

test("a new item shows up in the list and the summary", () => {
  const page = fruit();
  page.filterBox.type("ap");
  page.addItem("Apricot");
  assert.deepEqual(page.resultList.visible(), ["Apple", "Grape", "Apricot"]);
  assert.equal(page.summary(), "3 of 6");
});

test("clearing the box shows everything again", () => {
  const page = fruit();
  page.filterBox.type("zz");
  page.filterBox.type("");
  assert.equal(page.resultList.visible().length, 5);
  assert.equal(page.summary(), "5 of 5");
});
