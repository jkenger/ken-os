const named = (name, message, extra = {}) => Object.assign(new Error(message), { name }, extra);

test("a validation error is a 400 that names the bad fields", () => {
  const error = named("ValidationError", "Check the highlighted fields", {
    issues: [
      { path: "email", message: "Enter an email address" },
      { path: "quantity", message: "Must be at least 1" },
    ],
  });
  assert.deepEqual(toErrorResponse(error), {
    status: 400,
    body: {
      error: {
        code: "invalid_input",
        message: "Check the highlighted fields",
        fields: { email: "Enter an email address", quantity: "Must be at least 1" },
      },
    },
  });
});

test("a missing record is a 404", () => {
  assert.deepEqual(toErrorResponse(named("NotFoundError", "Order not found")), {
    status: 404,
    body: { error: { code: "not_found", message: "Order not found" } },
  });
});

test("a conflict is a 409", () => {
  assert.deepEqual(toErrorResponse(named("ConflictError", "That email is already registered")), {
    status: 409,
    body: { error: { code: "conflict", message: "That email is already registered" } },
  });
});

test("an unexpected error leaks nothing", () => {
  const error = new Error("connect ECONNREFUSED db.internal:5432 user=app password=hunter2");
  const response = toErrorResponse(error);
  assert.equal(response.status, 500);
  assert.deepEqual(response.body, { error: { code: "internal", message: "Something went wrong" } });
  assert.ok(!JSON.stringify(response).includes("hunter2"), "the response contains the database password");
});

test("every body has the same shape", () => {
  for (const error of [
    named("ValidationError", "Bad", { issues: [] }),
    named("NotFoundError", "Gone"),
    named("ConflictError", "Taken"),
    new TypeError("x is undefined"),
  ]) {
    const { body } = toErrorResponse(error);
    assert.deepEqual(Object.keys(body), ["error"]);
    assert.equal(typeof body.error.code, "string");
    assert.equal(typeof body.error.message, "string");
  }
});
