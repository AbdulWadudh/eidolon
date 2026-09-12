export const FIELD_PADDING = {
  horizontal: 18,
  vertical: 14,
  multilineTop: 16,
} as const;

export const GALLERY = {
  minZoom: 1,
  maxZoom: 5,
  doubleTapZoom: 2.5,
  doubleTapMs: 260,
  pageSize: 60,
  maxPageSize: 200,
  columns: 3,
  gapPx: 3,
} as const;

export const PORTRAIT_POLL_MS = 4000;

export const UI_MS = {
  themePersistDebounce: 120,
  pairingStatusPoll: 2000,
  copyFeedback: 1600,
  pressFeedback: 160,
  reveal: 400,
  revealStagger: 55,
  revealReduced: 200,
  disclosure: 220,
} as const;

export const EASING = {
  out: "cubic-bezier(0.23, 1, 0.32, 1)",
  inOut: "cubic-bezier(0.77, 0, 0.175, 1)",
} as const;

export const EASING_BEZIER = {
  out: [0.23, 1, 0.32, 1],
  inOut: [0.77, 0, 0.175, 1],
} as const;

export const PRESS_SCALE = 0.97;
