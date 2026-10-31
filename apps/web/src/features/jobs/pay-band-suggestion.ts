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
 *  since filtering pay without the owner's own say-so would hide postings with no visible reason. Keyed on pay
 *  specifically being unset, not on whether preferences have ever been saved at all -- an owner who's already
 *  touched Settings for something else (skip words, work setup) but never set a pay band still gets the
 *  reminder; one who's set a Minimum or Maximum pay, even a single one, has already decided and doesn't. */
export function suggestPayBand(
  targetCountry: string,
  pay: { minimumPay: number | null; maximumPay: number | null },
): PayBandSuggestion | null {
  if (pay.minimumPay !== null || pay.maximumPay !== null) return null;
  if (targetCountry.toUpperCase() !== "PH") return null;
  return PH_BAND;
}
