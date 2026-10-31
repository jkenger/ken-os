// A fixed ISO country -> default currency lookup (plans/jobs-multi-currency-pay.md, Slice 2). Used only to
// suggest which currency a Settings currency row probably belongs to for a country the owner has selected;
// never used to decide a posting's own currency, which always comes from the posting's own stated text.

const COUNTRY_CURRENCY: Record<string, string> = {
  US: "USD",
  CA: "CAD",
  GB: "GBP",
  IE: "EUR",
  AU: "AUD",
  NZ: "NZD",
  PH: "PHP",
  SG: "SGD",
  IN: "INR",
  DE: "EUR",
  FR: "EUR",
  NL: "EUR",
  ES: "EUR",
  IT: "EUR",
  JP: "JPY",
  HK: "HKD",
  AE: "AED",
  MX: "MXN",
  BR: "BRL",
  ZA: "ZAR",
  CN: "CNY",
  KR: "KRW",
  TH: "THB",
  VN: "VND",
  ID: "IDR",
  MY: "MYR",
};

export function defaultCurrencyFor(country: string): string | null {
  return COUNTRY_CURRENCY[country.toUpperCase()] ?? null;
}
