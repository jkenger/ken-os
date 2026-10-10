function toErrorResponse(error) {
  return {
    status: 500,
    body: { error: error.message, stack: error.stack },
  };
}
