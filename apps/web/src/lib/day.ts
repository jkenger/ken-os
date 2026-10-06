// The owner's calendar day. Daily practice and the daily AI and lookup limits turn over at the owner's midnight, not
// the server's. Ken OS has one owner, in Manila; OWNER_TIME_ZONE overrides it. Decided 2026-10-06
// (docs/architecture/engineering-redesign.md, Q4). Stored dates written before then stay as they were.

export const OWNER_TIME_ZONE = process.env.OWNER_TIME_ZONE || "Asia/Manila";

const parts = (date: Date, timeZone: string) => {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return { year: +values.year, month: +values.month, day: +values.day, hour: +values.hour, minute: +values.minute, second: +values.second };
};

/** The owner's date as YYYY-MM-DD. */
export function ownerDay(now = new Date(), timeZone = OWNER_TIME_ZONE): string {
  const { year, month, day } = parts(now, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The instant the owner's current day began. */
export function ownerDayStart(now = new Date(), timeZone = OWNER_TIME_ZONE): Date {
  const local = parts(now, timeZone);
  // The zone's offset from UTC right now, then midnight of the local date shifted by it.
  const offset = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second) - Math.floor(now.getTime() / 1000) * 1000;
  return new Date(Date.UTC(local.year, local.month - 1, local.day) - offset);
}
