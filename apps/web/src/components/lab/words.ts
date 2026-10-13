// Screen wording for dates.

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en", { month: "short", day: "numeric" });
}
