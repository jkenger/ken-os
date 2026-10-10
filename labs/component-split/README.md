Move the search state into the page, so the box, the list and the summary always agree.

`createSearchPage(items)` builds three parts, the way a page splits into components: a `filterBox` you type into, a
`resultList` that shows matching items, and a `summary()` line such as `2 of 5`. Today each part keeps its own copy of
what it needs, so typing in the box doesn't change the list, and the summary stays at its first number.

Keep the same parts and calls:

- `filterBox.type(text)` sets the search text and `filterBox.value()` returns it.
- `resultList.visible()` returns the items that contain the text, ignoring case, in their original order.
- `addItem(item)` adds an item at the end.
- `summary()` returns `"<shown> of <total>"`.

Then write one sentence on where the search text should live, and why the count shouldn't be stored at all.
