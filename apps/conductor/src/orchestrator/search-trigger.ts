import { WEB_CONTEXT } from "@eidolon/config";

const YEAR = new RegExp(WEB_CONTEXT.yearPattern);

export function hasTemporalMarker(text: string): boolean {
  const lower = text.toLowerCase();
  if (YEAR.test(lower)) return true;
  return WEB_CONTEXT.temporalMarkers.some((marker) => lower.includes(marker));
}

export function shouldSearchWeb(text: string, allowSearch: boolean): boolean {
  if (!allowSearch) return false;
  return hasTemporalMarker(text);
}
