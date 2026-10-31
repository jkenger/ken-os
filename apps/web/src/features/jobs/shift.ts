// Labels a processed posting's required hours, converted to Philippine time (UTC+8, no daylight saving)
// (docs/product/job-finder.md, "Working hours"; plans/jobs-score.md, Slice 4). Shown on every row; never hides a
// posting. `timezoneOffsetMinutes` is a fixed UTC offset (e.g. +600 for AEDT), not a free-text abbreviation --
// resolving "EST" or "Sydney" to a concrete offset, including the posting's own daylight-saving state, is an
// entity-resolution job the AI extraction step already does well; this function only does the arithmetic, kept
// pure and simple enough to trust without re-checking the raw hours every time.

export type RequiredHours = { start: string; end: string; timezoneOffsetMinutes: number };

export type ShiftResult =
  | { label: "Day shift" | "Mid shift" | "Night shift"; start: string; end: string }
  | { label: "Flexible" | "Not listed" };

const PH_OFFSET_MINUTES = 8 * 60;
const MINUTES_PER_DAY = 24 * 60;
const NIGHT_START = 2 * 60; // 2 AM
const NIGHT_END = 6 * 60; // 6 AM
const DAY_START = 6 * 60; // 6 AM
const DAY_END = 19 * 60; // 7 PM
const MID_FORBIDDEN_START = 2 * 60; // 2 AM
const MID_FORBIDDEN_END = 12 * 60; // 12 PM

function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

function toHhMm(totalMinutes: number): string {
  const minutes = ((totalMinutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 < 12 ? "AM" : "PM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return mins === 0 ? `${hours12} ${period}` : `${hours12}:${String(mins).padStart(2, "0")} ${period}`;
}

/** Every minute the shift covers, in Philippine time, handling a range that crosses midnight. */
function phMinutes(start: string, end: string, timezoneOffsetMinutes: number): number[] {
  const shift = PH_OFFSET_MINUTES - timezoneOffsetMinutes;
  const startPh = (((toMinutes(start) + shift) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const endPh = (((toMinutes(end) + shift) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const span = endPh <= startPh ? endPh + MINUTES_PER_DAY - startPh : endPh - startPh;
  return Array.from({ length: span }, (_, i) => (startPh + i) % MINUTES_PER_DAY);
}

export function shiftLabel(requiredHours: RequiredHours | null, hoursFlexible: boolean): ShiftResult {
  if (hoursFlexible) return { label: "Flexible" };
  if (!requiredHours) return { label: "Not listed" };

  const minutes = phMinutes(requiredHours.start, requiredHours.end, requiredHours.timezoneOffsetMinutes);
  const shift = PH_OFFSET_MINUTES - requiredHours.timezoneOffsetMinutes;
  const startPh = (((toMinutes(requiredHours.start) + shift) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const endPh = (((toMinutes(requiredHours.end) + shift) % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  const start = toHhMm(startPh);
  const end = toHhMm(endPh);

  const needsNight = minutes.some((m) => m >= NIGHT_START && m < NIGHT_END);
  if (needsNight) return { label: "Night shift", start, end };

  const fitsDay = minutes.every((m) => m >= DAY_START && m < DAY_END);
  if (fitsDay) return { label: "Day shift", start, end };

  const fitsMid = minutes.every((m) => m < MID_FORBIDDEN_START || m >= MID_FORBIDDEN_END);
  if (fitsMid) return { label: "Mid shift", start, end };

  return { label: "Night shift", start, end };
}

/** The single display string stored on a match and shown on its row, e.g. "Mid shift, 5 PM to 1 AM" or just
 *  "Not listed" when there's nothing to show a range for. */
export function formatShift(result: ShiftResult): string {
  return "start" in result ? `${result.label}, ${result.start} to ${result.end}` : result.label;
}
