export const AFFINITY_HUD = {
  scaleMax: 100,
  toastHoldMs: 1800,
  toastEnterMs: 200,
  toastExitMs: 140,
  ringTransitionMs: 200,
  ringWidthPx: 2,
  subtitleSeparator: " • ",
  deltaGlyph: "✦",
  progressTrackHeightPx: 10,
  sliderStepPercent: 5,
} as const;

export const MIND_COPY = {
  drawerTitle: "Mind & Lorebook",
  drawerSubtitle: "What she remembers, and what she has not told you yet.",
  affinityHeading: "Relationship",
  affinityHint: "Slide to set where the two of you stand. Lock to hold it there.",
  lockOn: "Affinity locked",
  lockOff: "Lock affinity",
  lockedNote: "Her feelings will not drift while this is on.",
  loreHeading: "Lorebook",
  loreEmpty: "Nothing written yet. Lore entries surface when you mention them by name.",
  loreLockedPrefix: "Locked secret",
  loreLockedSuffix: "rank",
  loreKeysLabel: "Triggers on",
  chronicleHeading: "The Chronicle",
  chronicleEmpty: "No chapters yet. One is written every 30 messages.",
  chapterLabel: "Chapter",
  searchHeading: "Live web search",
  searchToggle: "Allow live web search",
  searchHint: "Lets her look things up when you ask about something current.",
  insightToggle: "Insight mode",
  insightHint: "Shows the relationship as numbers instead of only in how she writes.",
  organicStatus: "Active now",
  closeLabel: "Close",
  retryLabel: "Try again",
  loadFailed: "Could not reach the conductor.",
} as const;

export function affinityLabel(tier: string, score: number): string {
  return `${tier}${AFFINITY_HUD.subtitleSeparator}${score}/${AFFINITY_HUD.scaleMax}`;
}

export function affinityToastLabel(delta: number, score: number): string {
  const sign = delta > 0 ? "+" : "";
  return `${AFFINITY_HUD.deltaGlyph} Trust ${sign}${delta} (${score}/${AFFINITY_HUD.scaleMax})`;
}

export function affinityToastAnnouncement(delta: number, score: number, tier: string): string {
  const direction = delta > 0 ? "rose" : "fell";
  return `Trust ${direction} by ${Math.abs(delta)}. Now ${score} of ${AFFINITY_HUD.scaleMax}, ${tier}.`;
}
