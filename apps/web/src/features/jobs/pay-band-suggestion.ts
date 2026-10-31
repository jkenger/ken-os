import type { PayPeriod } from "./preferences-store";

export type PayBandSuggestion = {
  minimumPay: number;
  maximumPay: number;
  payCurrency: string;
  payPeriod: PayPeriod;
};

const PH_BAND: PayBandSuggestion = { minimumPay: 15000, maximumPay: 200000, payCurrency: "PHP", payPeriod: "month" };

/** Suggests a starting Minimum/Maximum pay band for an owner job-hunting in the Philippines, where most postings
 *  cluster (docs/product/job-finder.md). Never applied on its own: only offered as a reminder the owner confirms,
 *  since filtering pay without the owner's own say-so would hide postings with no visible reason. Once
 *  preferences have ever been saved, there's nothing left to suggest -- the owner has already decided, whatever
 *  they chose. */
export function suggestPayBand(targetCountry: string, hasSavedPreferences: boolean): PayBandSuggestion | null {
  if (hasSavedPreferences) return null;
  if (targetCountry.toUpperCase() !== "PH") return null;
  return PH_BAND;
}
