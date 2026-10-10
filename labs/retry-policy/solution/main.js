// Double the wait each attempt so a struggling service gets room to recover, and cap it so no caller waits forever.
// A real client also adds jitter, a random part of this delay, so many clients don't retry at the same moment.
function retryDelay(attempt) {
  return Math.min(1000 * 2 ** attempt, 30000);
}
