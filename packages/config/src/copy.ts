export const STATUS_COPY = {
  thinking: { label: "Thinking", line: "Thinking it over" },
  searching: { label: "Looking it up", line: "Checking what's happening out there" },
  painting: { label: "Taking a photo", line: "Capturing the moment" },
  speaking: { label: "Speaking", line: "Saying it out loud" },
  idle: { label: "Here", line: "" },
} as const;

export const CONNECTION_COPY = {
  connected: "Active now",
  connecting: "Reaching out…",
  reconnecting: "Reaching out again…",
  disconnected: "Out of reach",
} as const;

export const PHOTO_COPY = {
  framing: "Finding the light",
  taking: "Capturing the moment",
  noCamera: "No camera on this side",
  didNotCome: "That photo did not come out",
} as const;

export const PAIRING_COPY = {
  title: "Connect to your Eidolon",
  subtitle: "Scan the code showing on your computer",
  connecting: "Connecting…",
  cameraNeeded: "Let the camera see the code on your computer.",
  allowCamera: "Allow camera",
  manual: "Type it in instead",
  addressLabel: "Address",
  passphraseLabel: "Passphrase",
  passphraseHint: "The word shown on your computer",
  connect: "Connect",
  missingFields: "Fill in both the address and the passphrase.",
  notOurCode: "That is not an Eidolon code. Scan the one showing on your computer.",
  incompleteCode: "That code is incomplete. Show the full one on your computer and scan again.",
  refused: "That passphrase was not accepted. Check it matches the one on your computer.",
  serverError: "Your Eidolon answered, but something went wrong at its end. Check it is running.",
  unreachable:
    "Could not reach that address. Check it matches your computer and that you are both on the same network.",
} as const;

export const PAIRING_MESSAGES: readonly string[] = [
  PAIRING_COPY.missingFields,
  PAIRING_COPY.notOurCode,
  PAIRING_COPY.incompleteCode,
  PAIRING_COPY.refused,
  PAIRING_COPY.serverError,
  PAIRING_COPY.unreachable,
];

export const HOME_COPY = {
  connectedTo: "Connected to",
  disconnect: "Disconnect",
  whosHere: "Who's here",
  ready: "Ready when you are",
  sayHello: "Say hello",
  lookTitle: "Look & feel",
  lookBlurb: "Set the colours, type and corners — for everyone, or for one character.",
  typeTitle: "Type & fonts",
  typeBlurb: "Browse fonts and see them in place before you keep them.",
  open: "Open",
} as const;

export const THEME_COPY = {
  appliesTo: "Applies to",
  everyone: "Everyone",
  ownLook: "Custom look",
  sameAsEveryone: "Same as everyone",
  corners: "Corners",
  background: "Background",
  cards: "Cards",
  cardEdges: "Card edges",
  accent: "Accent",
  textOnAccent: "Text on accent",
  quietButtons: "Quiet buttons",
  textOnQuietButtons: "Text on quiet buttons",
  success: "Success",
  caution: "Caution",
  danger: "Danger",
  type: "Type",
  dialogue: "Dialogue",
  interface: "Interface",
  whatIsSet: "What's set right now",
  startOver: "Start over",
} as const;

export type StatusKey = keyof typeof STATUS_COPY;
export type ConnectionKey = keyof typeof CONNECTION_COPY;

export const ENHANCE_COPY = {
  action: "Rework this",
  working: "Reworking your message",
  revert: "Undo the rework",
  revertCount: (steps: number) => (steps === 1 ? "Undo the rework" : `Undo rework (${steps})`),
  failed: "Could not rework that. Your message is untouched.",
} as const;

export const CHARACTER_COPY = {
  rosterTitle: "Who's here",
  newCharacter: "New character",
  createTitle: "New character",
  editTitle: "Edit character",
  presetsTitle: "Start from a preset",
  presetsBlurb: "A written character to begin with. Everything stays editable afterwards.",
  fromBlank: "Write her from nothing",
  save: "Save",
  saving: "Saving",
  create: "Create her",
  creating: "Creating",
  cancel: "Cancel",
  deleteLabel: "Delete character",
  portrait: "Generate a portrait",
  portraitQueued: "Queued. Her face will appear on the roster shortly.",
  failed: "Could not reach the conductor.",
  emptyRoster: "Nobody here yet. Start from a preset, or write one from nothing.",
  nameLabel: "Name",
  nameHint: "What you call her.",
  taglineLabel: "Tagline",
  taglineHint: "One line about who she is. Shown on the roster.",
  personalityLabel: "Personality",
  personalityHint: "How she thinks and behaves, in prose.",
  scenarioLabel: "Scenario",
  scenarioHint: "Where the two of you are and how you know each other.",
  rulesLabel: "Rules",
  rulesHint:
    "Things she always or never does. Kept apart from personality so you can edit either alone.",
  examplesLabel: "Example dialogue",
  examplesHint: "A few exchanges showing how she talks. The strongest lever on her voice.",
  greetingLabel: "Greeting",
  greetingHint: "The first thing she says when a chat starts empty.",
  editBlurb: "Everything here shapes how she writes.",
  forkedNote: "Your copy. The original is untouched.",
  saved: "Saved.",
  savedAsCopy: "Saved as your own copy.",
  themeLabel: "Adjust her theme",
  publishLabel: "Publish her",
  publishHint: "Makes her visible to everyone on this conductor. Only her author can publish.",
  publishRefused: "Only her author can publish her.",
  systemLabel: "System prompt",
  systemHint: "Extra instructions, if you want them. Optional.",
} as const;
