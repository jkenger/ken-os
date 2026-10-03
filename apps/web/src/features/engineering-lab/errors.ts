/** A problem with the request itself, shown to the learner as is, with the HTTP status to answer with. */
export class LabInputError extends Error {
  constructor(message: string, readonly status = 400) {
    super(message);
  }
}
