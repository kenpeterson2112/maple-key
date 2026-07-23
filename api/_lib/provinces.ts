/**
 * Province/territory code → display name, for the Anthropic-backed endpoints.
 * The teacher picks a province in the planner's Class step; the code (e.g. "ON")
 * is sent to these routes and expanded here for the prompt. Falls back to
 * "Ontario" when no province is supplied, preserving the endpoints' historic
 * default (the resource corpus is ~98% Ontario).
 */
const PROVINCE_NAMES: Record<string, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
}

export function provinceLabel(code?: string | null): string {
  if (!code) return "Ontario"
  return PROVINCE_NAMES[code] ?? "Ontario"
}
