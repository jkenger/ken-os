function discountCases() {
  return [
    { subtotal: 10000, code: "SAVE10", expected: 9000 },
    { subtotal: 2000, code: "FLAT500", expected: 1500 },
  ];
}
