import assert from "node:assert/strict";
import { test } from "node:test";
import { formatShift, shiftLabel } from "./shift";

test("formatShift composes the label and hours into one display string", () => {
  assert.equal(formatShift({ label: "Mid shift", start: "5 PM", end: "1 AM" }), "Mid shift, 5 PM to 1 AM");
  assert.equal(formatShift({ label: "Not listed" }), "Not listed");
  assert.equal(formatShift({ label: "Flexible" }), "Flexible");
});

test("no hours or time zone stated is Not listed", () => {
  assert.deepEqual(shiftLabel(null, false), { label: "Not listed" });
});

test("hours flexible/async/owner's choice is Flexible, even if requiredHours is also somehow set", () => {
  assert.deepEqual(shiftLabel({ start: "09:00", end: "17:00", timezoneOffsetMinutes: 0 }, true), {
    label: "Flexible",
  });
});

test("AU Sydney 6 AM to 2 PM in Philippine time is Day shift", () => {
  // Sydney AEDT (+11) 9 AM-5 PM -> PH time (+8) 6 AM-2 PM
  const result = shiftLabel({ start: "09:00", end: "17:00", timezoneOffsetMinutes: 11 * 60 }, false);
  assert.equal(result.label, "Day shift");
  assert.deepEqual(result, { label: "Day shift", start: "6 AM", end: "2 PM" });
});

test("UK London 5 PM to 1 AM in Philippine time is Mid shift", () => {
  // UK is back on GMT (+0) by 28 Oct 2026, BST having ended -- 9 AM-5 PM -> PH time (+8) 5 PM-1 AM
  const result = shiftLabel({ start: "09:00", end: "17:00", timezoneOffsetMinutes: 0 }, false);
  assert.deepEqual(result, { label: "Mid shift", start: "5 PM", end: "1 AM" });
});

test("US East 9 PM to 5 AM in Philippine time is Night shift", () => {
  // Still EDT (-4) on 28 Oct 2026, before US DST ends 2 Nov -- 9 AM-5 PM -> PH time (+8) 9 PM-5 AM
  const result = shiftLabel({ start: "09:00", end: "17:00", timezoneOffsetMinutes: -4 * 60 }, false);
  assert.deepEqual(result, { label: "Night shift", start: "9 PM", end: "5 AM" });
});

test("US West 12 AM to 8 AM in Philippine time is Night shift", () => {
  // Still PDT (-7) on 28 Oct 2026 -- 9 AM-5 PM -> PH time (+8) 12 AM-8 AM
  const result = shiftLabel({ start: "09:00", end: "17:00", timezoneOffsetMinutes: -7 * 60 }, false);
  assert.deepEqual(result, { label: "Night shift", start: "12 AM", end: "8 AM" });
});

test("a US posting stating only a partial-day overlap (9 PM to 1 AM in Philippine time) is Mid shift, not Night", () => {
  // "overlap with EST until noon": 8 AM-12 PM EST (-5) -> PH time (+8) 9 PM-1 AM
  const result = shiftLabel({ start: "08:00", end: "12:00", timezoneOffsetMinutes: -5 * 60 }, false);
  assert.deepEqual(result, { label: "Mid shift", start: "9 PM", end: "1 AM" });
});

test("a range entirely inside 6 AM to 7 PM is Day shift, at the exact boundary", () => {
  const result = shiftLabel({ start: "06:00", end: "19:00", timezoneOffsetMinutes: PH_OFFSET() }, false);
  assert.equal(result.label, "Day shift");
});

test("a range needing exactly 2 AM is Night shift, not Day or Mid", () => {
  const result = shiftLabel({ start: "01:00", end: "02:01", timezoneOffsetMinutes: PH_OFFSET() }, false);
  assert.equal(result.label, "Night shift");
});

test("a range ending at exactly 6 AM (not needing past it) is not forced to Night by that boundary alone", () => {
  // 1 AM to 6 AM touches the forbidden zone [2AM,6AM) at 2-5:59 AM, so this one *is* Night -- exercises the
  // half-open boundary at the Night zone's own start, not a false negative.
  const result = shiftLabel({ start: "01:00", end: "06:00", timezoneOffsetMinutes: PH_OFFSET() }, false);
  assert.equal(result.label, "Night shift");
});

test("a range from midnight to 2 AM (not reaching the forbidden zone) is Mid shift", () => {
  const result = shiftLabel({ start: "00:00", end: "02:00", timezoneOffsetMinutes: PH_OFFSET() }, false);
  assert.equal(result.label, "Mid shift");
});

function PH_OFFSET(): number {
  return 8 * 60;
}
