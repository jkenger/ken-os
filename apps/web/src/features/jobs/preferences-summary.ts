import { ALL_JOB_TYPES, ALL_WORK_SETUPS, JOB_TYPE_LABELS, WORK_SETUP_LABELS } from "./active-filter-chips";
import { DEFAULTS } from "./preferences-defaults";
import type { JobPreferences } from "./preferences-store";

export type PreferencesSummary = { stateWord: "Defaults" | "Custom"; line: string; caption?: string };

/** The Overview's Preferences row (docs/mockups/jobs-redesign-canvas/Overview.dc.html): a readable one-line
 *  summary of what's actually restricting results, built with the same "only show a dimension when it's
 *  actually excluding something" rule as `activeFilterChips`, plus a caption flagging the one thing most worth
 *  noticing -- that an unset minimum pay lets every pay through. */
export function preferencesSummary(preferences: JobPreferences): PreferencesSummary {
  const segments: string[] = [];

  if (preferences.workSetups.length < ALL_WORK_SETUPS.length) {
    segments.push(preferences.workSetups.map((setup) => WORK_SETUP_LABELS[setup]).join(", "));
  }
  if (preferences.jobTypes.length < ALL_JOB_TYPES.length) {
    segments.push(preferences.jobTypes.map((type) => JOB_TYPE_LABELS[type]).join(", "));
  }
  if (preferences.seniority.length < 4) {
    segments.push(preferences.seniority.map((level) => level[0]!.toUpperCase() + level.slice(1)).join(", "));
  }
  segments.push(preferences.postedWithinDays >= 365 ? "Anytime" : `Posted within ${preferences.postedWithinDays} days`);

  const isDefault = JSON.stringify(preferences) === JSON.stringify(DEFAULTS);

  return {
    stateWord: isDefault ? "Defaults" : "Custom",
    line: segments.join(" · "),
    caption:
      preferences.minimumPay === null && preferences.maximumPay === null
        ? "Minimum pay not set, so every pay passes"
        : undefined,
  };
}
