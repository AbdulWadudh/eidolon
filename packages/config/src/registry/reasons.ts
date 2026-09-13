export const REASONS = {
  requestRead: "The conductor reads this on every request that uses it.",
  canvasBundled:
    "The canvas compiles this into the app bundle. The conductor's overlay cannot reach it.",
  bootRead: "Read once while the process starts. Nothing re-reads it until a restart.",
  workerBoot: "Read once when the workers are constructed. Changing it needs a restart.",
  authBoot: "Read once when better-auth is constructed. Changing it needs a restart.",
  copy: "Wording shown to a person. Changing it here would not reach the shipped app.",
  routeContract: "A route the shipped app already calls by this exact path.",
  typeLevel:
    "The key set behind a TypeScript union. A different value fails to compile, not at run time.",
  wireFormat: "Parsed back out of text the model or a file wrote. Both sides must agree.",
  storedShape: "Objects already written to storage were named and typed by this.",
  dbShape: "Table and column names this queries directly.",
  redisKey: "A Redis key or job name. Changing it orphans whatever is already queued.",
  envVar: "Set in the environment the conductor was started in.",
  secret: "A credential. Its value is never sent to a client.",
  llmBound: "Fixed by the model file loaded on the LLM endpoint.",
  comfyBound: "Fixed by the models and nodes the ComfyUI install actually has.",
  kokoroBound: "Fixed by the voices the Kokoro endpoint exposes.",
  whisperBound: "Fixed by the transcription endpoint's request contract.",
  lanceBound: "Fixed by the embedding model the LanceDB table was indexed with.",
  affinityScale:
    "The canvas ships its own copy of this scale in AFFINITY_HUD. Changing one desyncs the other.",
  promptStore: "Managed by the prompts screen and the prompts table, not by this overlay.",
  seedData: "Copied into a character once, at creation. Editing it changes nothing already made.",
  cardSpec: "Part of the Tavern V2 card format that other tools read and write.",
  deepLink: "The deep-link scheme registered by the installed app.",
} as const;
