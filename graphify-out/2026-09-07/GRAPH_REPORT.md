# Graph Report - eidolon  (2026-09-07)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2928 nodes · 6778 edges · 202 communities (147 shown, 54 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 180 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9e78d578`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- demo.tsx
- useResolvedTheme
- CharacterSettingsSheet.tsx
- config/src/index.ts
- ChatTopBar.tsx
- scripts
- affinity.ts
- prompt-builder.ts
- dependencies
- reply-stream.ts
- characters/[id].tsx
- PhotoViewer.tsx
- api/characters.ts
- api.ts
- lancedb.ts
- includes
- server.ts
- theme-store.ts
- card-parser.ts
- chat-turn.ts
- card-parser.test.ts
- expo
- lorebook.test.ts
- queues.ts
- voice-turn.ts
- dependencies
- server/index.ts
- call-store.ts
- protocol/src/index.ts
- safeJsonParse
- store/storage.ts
- tokens/src/index.ts
- character-author.ts
- tts.ts
- comfyui.ts
- Release v1.1.0
- Eidolon Logo Mark (public/logo.png)
- RoleplayText.tsx
- websocket.ts
- conductor/src/index.ts
- v1.ts
- db/index.ts
- suggestions.ts
- typescript
- chat-store.ts
- photo-look.ts
- search.ts
- services/storage.ts
- compilerOptions
- chat-api.ts
- ChatFeed.tsx
- chronicle.ts
- page.ts
- POST /api/v1/characters/author — field, mode, draft, context
- config/tsconfig.json
- audio-duration.ts
- selfie.ts
- Four tiers of memory
- doctor.ts
- canvas/services/font-registry.ts
- proactive-worker.ts
- photo-ideas.ts
- Pairing flow, host plus token
- release.ts
- chat-photos.ts
- font-picker-modal.tsx
- enhance.ts
- tasks
- CHANGELOG — release notes parsed by scripts/release.ts
- chat-types.ts
- scripts
- gpu-worker.ts
- prompts.ts
- canvas/store/connection.ts
- session.ts
- Theme Studio and Theme & Font Lab
- AFFINITY.tiers ladder owned by code
- services/comfy-workflow.ts graph builder
- The local AI stack setup guide
- Eidolon Logo 192x192 (PWA Icon)
- compilerOptions
- getPrompt
- stage-directions.ts
- Project state snapshot
- ThemeTokens published as CSS variables
- Android APK: 136.5 MB to 42.9 MB
- Conductor character surface routes
- protocol/package.json
- compilerOptions
- voice-picker.tsx
- use-suggestions.ts
- google-fonts.ts
- §15 Configuration lives in @eidolon/config
- Character card fields reaching the prompt
- Eidolon: local-first AI companion
- metro.config.js
- devDependencies
- card-api.ts
- comfy-workflow.ts
- conductor/tsconfig.json
- S3-compatible storage service (initStorage, uploadImage, uploadAudio)
- services/stage-directions.ts — one cap enforced everywhere
- config/package.json
- stack.ts
- mind-block.ts
- ninja 'manifest build.ninja still dirty' 260-char path failure
- Reply suggestion generator
- Multi-tier search ladder in services/search.ts
- tsconfig.json
- apk.ts
- AqueousPool.tsx
- conductor/package.json
- photo-caption.ts
- packages/config/src/copy.ts shared vocabulary
- tokens/package.json
- stack-nav.test.ts
- with-android-build-optimizations.js
- FallbackStorage
- photo-line.ts
- reply-length.ts
- fontScale publishes explicit --text-* pixel values rather than scaling rem
- character.ts
- use-chat-view.ts
- proactive.ts
- devDependencies
- GET /api/v1/characters/:id/gallery merging three image sources
- Background work moves onto BullMQ queues
- completeText raw completions endpoint
- src/roleplay.ts
- check-file-size.ts
- theme-css-vars.ts
- PAIRING_SECRET — the only gate on the WebSocket
- §18 Motion is designed, gated, and measured
- png-chunks.d.ts
- Pairing screen redesign (pairing/page.ts)
- §11 Report honestly
- avatar-crop.test.ts
- enhance-stack.test.ts
- Desktop Phase 0: make the web target real again
- Trap 24: audio_chunk arrives before the assistant message is committed
- PaintingCard calm placeholder loader
- Gestures do not cross a Modal boundary
- §10 Every change set is recorded
- @eidolon/protocol
- es-toolkit
- with-dark-system-chrome.js
- Trap 12: FlashList v2 removed estimatedItemSize
- Angle-bracket nudge syntax
- feed-scroll.ts trackLiveEdge
- Mind and Lorebook drawer
- Trap 19: platform_machine == 'x86_64' never matches on Windows
- storage-env.ts
- Strict Biome Compliance
- Utility First (es-toolkit)
- Strict TypeScript & Zero any
- global.d.ts
- nativewind-env.d.ts
- class-variance-authority
- clsx
- expo
- expo-audio
- expo-build-properties
- expo-camera
- expo-file-system
- expo-font
- expo-linear-gradient
- expo-media-library
- expo-status-bar
- @hugeicons/core-free-icons
- react-dom
- react-native
- react-native-gesture-handler
- react-native-keyboard-controller
- react-native-mmkv
- react-native-reanimated
- react-native-safe-area-context
- react-native-svg
- react-native-web
- @rn-primitives/dropdown-menu
- @rn-primitives/slot
- @rn-primitives/types
- @shopify/flash-list
- tailwind-merge
- zustand
- Dead 1008 close-code branch replaced with an HTTP re-check
- react-native-keyboard-controller replaces KeyboardAvoidingView
- nextLiveEdge: leaving the live edge requires a real gesture
- Debounced MMKV persistence out of the reducer
- Dragonfly flags: no cache_mode, emulated cluster mode with hashtags
- Viewer counter derived from scroll offset, not onViewableItemsChanged
- services/audio-bus.ts playback registry
- Novel prose crept through a gap in the rules
- KeyboardAvoidingView nesting regression
- §12 Source files stay under 300 lines
- isTrayDismissed became isTrayOpen — read the flag positively
- Horizontal padding belongs on contentContainerStyle, not the ScrollView frame
- ioredis is a direct dependency; Bun's RedisClient cannot stand in
- Queue tests need their own prefix or a dev worker eats the jobs
- router.dismissTo back stack
- Badge digit centring against font metrics
- §13 Commit attribution: no AI co-author trailers

## God Nodes (most connected - your core abstractions)
1. `useResolvedTheme()` - 108 edges
2. `getPrompt()` - 39 edges
3. `AppIcon()` - 35 edges
4. `safeJsonParse()` - 32 edges
5. `UI_MS` - 29 edges
6. `scripts` - 28 edges
7. `cn()` - 26 edges
8. `render()` - 26 edges
9. `PressableScale` - 26 edges
10. `useChatStore` - 26 edges

## Surprising Connections (you probably didn't know these)
- `plugins/with-dark-system-chrome.js` --semantically_similar_to--> `with-android-build-optimizations.js`  [INFERRED] [semantically similar]
  changelog/2026/09/2026-09-06-system-chrome-and-loading-states.md → docs/BUILD_ANDROID.md
- `The local AI stack setup guide` --semantically_similar_to--> `Local AI stack (LLM, TTS, image)`  [INFERRED] [semantically similar]
  stack/README.md → changelog/2026/09/2026-09-06-local-ai-stack.md
- `lint cannot pass on Windows without a .gitattributes` --semantically_similar_to--> `Missing .gitattributes and core.autocrlf line endings`  [AMBIGUOUS] [semantically similar]
  changelog/2026/09/2026-09-05-state-out-of-the-repo.md → LLM_STATE.md
- `ninja 'manifest build.ninja still dirty' 260-char path failure` --semantically_similar_to--> `Trap 5: Windows 260-character CMake prefab path limit`  [INFERRED] [semantically similar]
  changelog/2026/09/2026-09-05-android-apk-size.md → LLM_STATE.md
- `A stop sequence matching the opening token` --rationale_for--> `Reply suggestion generator`  [INFERRED]
  stack/README.md → changelog/2026/09/2026-09-06-local-ai-stack.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Four tiers of memory feeding one prompt** — changelog_2026_09_2026_09_06_memory_lorebook_and_the_affinity_hud_workinghistory, changelog_2026_09_2026_09_06_memory_lorebook_and_the_affinity_hud_chronicle, changelog_2026_09_2026_09_06_memory_lorebook_and_the_affinity_hud_memory_manager, changelog_2026_09_2026_09_06_memory_lorebook_and_the_affinity_hud_lorebook, changelog_2026_09_2026_09_06_memory_lorebook_and_the_affinity_hud_prompt_builder [EXTRACTED 1.00]
- **Three inference servers resident on one GPU** — changelog_2026_09_2026_09_06_local_ai_stack_llama_cpp, changelog_2026_09_2026_09_06_local_ai_stack_comfyui, changelog_2026_09_2026_09_06_local_ai_stack_kokoro_fastapi, changelog_2026_09_2026_09_06_local_ai_stack_local_ai_stack [EXTRACTED 1.00]
- **Getting structure out of a small local roleplay model** — llm_state_constrained_decoding, llm_state_roleplay_finetune_meta_instructions, llm_state_jsonrepair_prose_to_array, llm_state_example_lines_copied_verbatim, llm_state_few_shot_false_memories, changelog_2026_09_2026_09_06_authoring_portrait_gallery_actions_example_copying_guards, changelog_2026_09_2026_09_06_bullmq_job_queues_chronicle_summariser [INFERRED 0.85]
- **Authenticated pairing flow, end to end** — changelog_2026_09_2026_09_05_pairing_and_fonts_authenticated_verify_endpoint, changelog_2026_09_2026_09_05_pairing_and_fonts_websocket_backoff_client, changelog_2026_09_2026_09_05_pairing_and_fonts_browser_rendered_qr, changelog_2026_09_2026_09_05_api_versioning_and_config_package_pairing_secret_no_default, llm_state_ws_401_before_upgrade, llm_state_android_cleartext_http [INFERRED 0.85]
- **Lifecycle of one streamed chat turn** — changelog_2026_09_2026_09_05_streaming_chat_engine_single_socket_owner, changelog_2026_09_2026_09_05_streaming_chat_engine_idle_commits_turn, changelog_2026_09_2026_09_06_actions_stop_eating_the_reply_action_gate, changelog_2026_09_2026_09_05_streaming_chat_engine_voice_note_stored_object, changelog_2026_09_2026_09_05_streaming_chat_engine_clear_auto_play, changelog_2026_09_2026_09_06_a_poisoned_transcript_and_a_bounded_prompt_prompt_budget [INFERRED 0.85]
- **Guards that check model output before it reaches the reader** — changelog_2026_09_2026_09_06_local_ai_stack_persona_guard, changelog_2026_09_2026_09_06_she_can_say_she_does_not_know_leaksinstruction, changelog_2026_09_2026_09_06_selfies_usablecaption, changelog_2026_09_2026_09_06_selfies_ispromptlike, changelog_2026_09_2026_09_06_photo_ideas_stop_parroting_the_prompt_isusable, changelog_2026_09_2026_09_07_presets_a_voice_and_a_roster_narratesinthirdperson, changelog_2026_09_2026_09_06_reader_label_and_back_stack_stripspeakerlabel [INFERRED 0.85]

## Communities (202 total, 54 thin omitted)

### Community 0 - "demo.tsx"
Cohesion: 0.05
Nodes (72): humanPairingError(), PairingScreen(), ACCENT_PRESETS, BORDER_PRESETS, CANVAS_PRESETS, CARD_PRESETS, DynamicDemoScreen(), RADIUS_PRESETS (+64 more)

### Community 1 - "useResolvedTheme"
Cohesion: 0.04
Nodes (60): AVATAR_ACTIONS, STATUS_LABEL, AudioNotePill(), AudioNotePillProps, AudioTabSkeleton(), AudioTabSkeletonProps, BAR_SCALES, WaveformBars() (+52 more)

### Community 2 - "CharacterSettingsSheet.tsx"
Cohesion: 0.07
Nodes (61): NewCharacterScreen(), CharacterFields(), CharacterFieldsProps, ALL_FIELDS, CharacterForm(), CharacterFormProps, PortraitStudio(), PortraitStudioProps (+53 more)

### Community 3 - "config/src/index.ts"
Cohesion: 0.05
Nodes (56): CallControls(), CallControlsProps, CallSubtitles(), CallSubtitlesProps, CallTopBar(), CallTopBarProps, FieldAuthorRowProps, PortraitSheetProps (+48 more)

### Community 4 - "ChatTopBar.tsx"
Cohesion: 0.09
Nodes (31): AffinityToast(), AffinityToastProps, ChatTopBar(), ChatTopBarProps, AffinitySection(), AffinitySectionProps, clamp(), ChronicleSection() (+23 more)

### Community 5 - "scripts"
Cohesion: 0.05
Nodes (41): name, overrides, lightningcss, react-native-worklets, packageManager, private, resolutions, lightningcss (+33 more)

### Community 6 - "affinity.ts"
Cohesion: 0.11
Nodes (34): AffinityOverride, applyAffinityOverride(), buildMindView(), ChapterView, LoreView, MindView, toChapterView(), appendChronicle() (+26 more)

### Community 7 - "prompt-builder.ts"
Cohesion: 0.11
Nodes (31): getActiveChronicle(), recallMemories(), AssembleOptions, assemblePrompt(), clip(), estimateTokens(), fitHistory(), gatherWeb() (+23 more)

### Community 8 - "dependencies"
Cohesion: 0.05
Nodes (39): @eidolon/config, @eidolon/tokens, @eidolon/config, @eidolon/tokens, dependencies, @aws-sdk/client-s3, better-auth, @bull-board/api (+31 more)

### Community 9 - "reply-stream.ts"
Cohesion: 0.11
Nodes (32): createPersonaFilter(), scan(), deflection(), findTell(), INSTRUCTION_KEYS, leaksInstruction(), normalizeForEcho(), opening() (+24 more)

### Community 10 - "characters/[id].tsx"
Cohesion: 0.10
Nodes (29): Index(), CharacterProfileScreen(), MainCharactersScreen(), GalleryAction, GalleryActions(), GalleryActionsProps, ICONS, LABELS (+21 more)

### Community 11 - "PhotoViewer.tsx"
Cohesion: 0.09
Nodes (29): CallStage(), PHASE_LINE, CharacterCardProps, CharacterRosterCard(), AvatarCrop(), AvatarCropProps, CharacterSettingsHeader(), CharacterSettingsHeaderProps (+21 more)

### Community 12 - "api/characters.ts"
Cohesion: 0.13
Nodes (30): characters, Draft, mountCharacters(), TEXT_FIELDS, adopt(), CharacterCard, CharacterDraft, characterExists() (+22 more)

### Community 13 - "api.ts"
Cohesion: 0.13
Nodes (33): AdminRoute, API_ROUTES, API_VERSION, apiPath(), ApiRoute, apiUrl(), characterAffinityPath(), characterAffinityUrl() (+25 more)

### Community 14 - "lancedb.ts"
Cohesion: 0.12
Nodes (30): aboveThreshold(), describeRecall(), ExchangeToRemember, formatExchange(), formatRecall(), lookUp(), NEWLINE, rememberExchange() (+22 more)

### Community 15 - "includes"
Cohesion: 0.06
Nodes (34): css, parser, files, ignoreUnknown, includes, formatter, enabled, indentStyle (+26 more)

### Community 16 - "server.ts"
Cohesion: 0.06
Nodes (34): AudioChunkEvent, AudioChunkSchema, AudioFormat, AudioFormatEnum, ErrorEvent, ErrorSchema, ImageAspectRatio, ImageAspectRatioEnum (+26 more)

### Community 17 - "theme-store.ts"
Cohesion: 0.12
Nodes (31): RootLayout(), CharacterOverrides, COLOR_TOKEN_KEYS, ColorTokens, composeTheme(), createDefaultPalettes(), defaultColors(), defaultShared() (+23 more)

### Community 18 - "card-parser.ts"
Cohesion: 0.11
Nodes (28): gallery, countGallery(), currentAvatar(), GalleryImage, GalleryKind, listGallery(), Row, CharacterLook (+20 more)

### Community 19 - "chat-turn.ts"
Cohesion: 0.18
Nodes (22): appendMessage(), getCharacterCard(), getRecentMessages(), handleChatTurn(), handleRegenerateSuggestions(), handleEnhanceMessage(), ClientSessionManager, handleClientMessage() (+14 more)

### Community 20 - "card-parser.test.ts"
Cohesion: 0.16
Nodes (26): asRecord(), asString(), asStrings(), decodeItxt(), isCardKeyword(), parseCardBuffer(), readAffinityGate(), readCardData() (+18 more)

### Community 21 - "expo"
Cohesion: 0.06
Nodes (30): backgroundColor, foregroundImage, adaptiveIcon, backgroundColor, package, versionCode, expo, android (+22 more)

### Community 22 - "lorebook.test.ts"
Cohesion: 0.13
Nodes (25): ensureCharacter(), deleteLoreEntry(), getActiveLoreEntries(), getLoreEntries(), LoreRow, NewLoreEntry, StoredLoreEntry, toEntry() (+17 more)

### Community 23 - "queues.ts"
Cohesion: 0.14
Nodes (25): gpuQueue, s3UploadQueue, GpuJob, GpuJobData, GpuJobMap, GpuJobName, MediaUploadJob, PortraitJob (+17 more)

### Community 24 - "voice-turn.ts"
Cohesion: 0.13
Nodes (19): enqueueUploadJob(), ttsApiUrl(), concatMp3(), reportOffline(), silentMp3(), synthesizeSentence(), createSentenceBuffer(), take() (+11 more)

### Community 25 - "dependencies"
Cohesion: 0.07
Nodes (29): dependencies, expo-constants, expo-document-picker, expo-haptics, expo-image, expo-linking, expo-router, @hugeicons/react-native (+21 more)

### Community 26 - "server/index.ts"
Cohesion: 0.15
Nodes (23): CACHE, DATA_FILES, MEMORY, MOCK, PAIRING, SERVER_DEFAULTS, SOCKET, STORAGE (+15 more)

### Community 27 - "call-store.ts"
Cohesion: 0.12
Nodes (21): CallScreen(), CallStageProps, CallAudio, playableUri(), sampleLevel(), useCallAudio(), CacheDirectory, cacheSpokenSentence() (+13 more)

### Community 28 - "protocol/src/index.ts"
Cohesion: 0.10
Nodes (23): ConductorSocket, ChatTurnEvent, ChatTurnSchema, ClientMessage, ClientMessageSchema, EnhanceMessageEvent, EnhanceMessageSchema, InterruptEvent (+15 more)

### Community 29 - "safeJsonParse"
Cohesion: 0.14
Nodes (21): AssembledPrompt, buildChronicleMessages(), CHRONICLE_SCHEMA, ChronicleResponse, structuredBullets(), summarizeMessages(), tidy(), toBullets() (+13 more)

### Community 30 - "store/storage.ts"
Cohesion: 0.10
Nodes (6): appStorage, FallbackFile, initStorage(), KeyValueStorage, MMKVInstance, MMKVStorageWrapper

### Community 31 - "tokens/src/index.ts"
Cohesion: 0.11
Nodes (15): mockMemory, createQueueBoard(), eidolonTheme(), allQueues, ADMIN_ROUTES, STATIC_ROUTES, ColorKey, COLORS (+7 more)

### Community 32 - "character-author.ts"
Cohesion: 0.17
Nodes (21): authoring, AuthorContext, authorField(), attempt(), AuthorUnavailableError, buildAuthorPrompt(), buildContext(), exampleAnswers() (+13 more)

### Community 33 - "tts.ts"
Cohesion: 0.13
Nodes (20): mountVoices(), voices, speakableText(), synthesizeSpeech(), isKnownVoice(), KokoroVoice, listVoices(), sortVoices() (+12 more)

### Community 34 - "comfyui.ts"
Cohesion: 0.15
Nodes (23): COMFY_CLIENT_ID, connectComfyEvents(), handleBinary(), handleText(), PromptProgress, PromptWatcher, socketUrl(), watchers (+15 more)

### Community 35 - "Release v1.1.0"
Cohesion: 0.09
Nodes (25): No unprompted APK builds, Breaking: every route under /api/v1/, @eidolon/config single source of configuration, Background job queues and /admin/queues, S3-compatible object storage for media, Release v1.1.0, Media grouped by character prefix, plugins/with-dark-system-chrome.js (+17 more)

### Community 36 - "Eidolon Logo Mark (public/logo.png)"
Cohesion: 0.16
Nodes (25): Eidolon Logo Mark (logo.svg), Auto-Traced Geometry: Only m/l/h/v/q/c/z, No Gradients or Strokes, Eidolon Brand Identity: Speaking Companion Persona, Reusable defs Path id="a" (Small Teardrop Sliver), Letter E Monogram Silhouette, Eidolon Brand Identity: A Speaking Apparition, Ember Palette: 135 Warm Orange Fills (#cc500f to #f8b922), Negative-Space Female Face in Profile (+17 more)

### Community 37 - "RoleplayText.tsx"
Cohesion: 0.15
Nodes (21): DIALOGUE_CLASS, INFLUENCE_CLASS, NARRATION_CLASS, RoleplaySegments(), RoleplaySegmentsProps, RoleplayTextProps, SEGMENT_CLASS, segmentClass() (+13 more)

### Community 38 - "websocket.ts"
Cohesion: 0.14
Nodes (22): useChatSocket(), closeSocket(), configureSocket(), getSocketStatus(), MessageListener, messageListeners, onServerMessage(), onSocketStatus() (+14 more)

### Community 39 - "conductor/src/index.ts"
Cohesion: 0.13
Nodes (18): after, before, v1, AUTH_BASE_URL, generatePairingPayload(), PAIRING_SECRET, validateToken(), authOptions (+10 more)

### Community 40 - "v1.ts"
Cohesion: 0.19
Nodes (20): buildHealthReport(), definitions, describePrompt(), hydrate(), listPrompts(), loadPrompts(), memory, PromptRecord (+12 more)

### Community 41 - "db/index.ts"
Cohesion: 0.13
Nodes (17): checkDatabaseHealth(), db, deleteMessage(), forgetCharacter(), StoredCharacter, StoredMessage, StoredMind, columnNames() (+9 more)

### Community 42 - "suggestions.ts"
Cohesion: 0.19
Nodes (22): spokenWords(), stripActions(), capActions(), cleanLine(), extractCandidates(), FALLBACK_SPOKEN, FALLBACK_WITH_ACTION, fallbackSuggestions() (+14 more)

### Community 43 - "typescript"
Cohesion: 0.11
Nodes (23): @eidolon/tsconfig, @types/bun, typescript, @eidolon/tsconfig, devDependencies, @eidolon/tsconfig, @types/bun, @types/qrcode-terminal (+15 more)

### Community 44 - "chat-store.ts"
Cohesion: 0.17
Nodes (17): sendMessage(), isCallLive(), reduceServerMessage(), attachAudioToLastAssistant(), audioChunkToAttachment(), ChatRole, createMessage(), createMessageId() (+9 more)

### Community 45 - "photo-look.ts"
Cohesion: 0.14
Nodes (20): getCharacterAppearance(), setCharacterAppearance(), appearances, BODY_CHANGE, composeAppearance(), describeAppearance(), EMPTY_WORDS, FALLBACK_LOOK (+12 more)

### Community 46 - "search.ts"
Cohesion: 0.12
Nodes (13): CacheEntry, clean(), formatSearchResults(), fromDuckDuckGo(), fromExa(), fromSerper(), searchCache, SearchResultItem (+5 more)

### Community 47 - "services/storage.ts"
Cohesion: 0.19
Nodes (19): audioKey(), buildPublicReadPolicy(), characterKey(), deleteFile(), describe(), getS3Client(), imageKey(), initStorage() (+11 more)

### Community 48 - "compilerOptions"
Cohesion: 0.09
Nodes (20): files, name, private, version, compilerOptions, allowSyntheticDefaultImports, jsx, module (+12 more)

### Community 49 - "chat-api.ts"
Cohesion: 0.16
Nodes (17): ChatScreen(), formatClockTime(), formatDuration(), formatVoiceDuration(), wholeSeconds(), fetchTranscript(), forgetCharacter(), requestJson() (+9 more)

### Community 50 - "ChatFeed.tsx"
Cohesion: 0.13
Nodes (15): ChatFeed(), ChatFeedProps, STATUS_LINE, ChatFeedEmpty(), MessageCard, MessageCardBase(), MessageCardProps, RoleplayText() (+7 more)

### Community 51 - "chronicle.ts"
Cohesion: 0.18
Nodes (18): countMessages(), getTranscript(), getStage(), batchForMilestone(), chapterForMilestone(), chronicleJobId(), isChronicleMilestone(), maybeSummarizeChronicle() (+10 more)

### Community 52 - "page.ts"
Cohesion: 0.17
Nodes (19): BannerFacts, renderBanner(), renderPairingQr(), row(), rule(), copyRow(), renderPairingPage(), script() (+11 more)

### Community 53 - "POST /api/v1/characters/author — field, mode, draft, context"
Cohesion: 0.09
Nodes (22): Selector-scoped store reads instead of whole-store subscriptions, metaPhrases catches the paraphrase of a stage-direction reminder, A poisoned transcript, and a prompt that cannot overrun its context, Read-time leaksInstruction filter over stored assistant turns, POST /api/v1/characters/author — field, mode, draft, context, Writing a character with help, rendering her face on demand, and gallery actions, Deterministic guards against the model copying prompt examples, Rewriting is cold (0.35), suggesting is warm (0.8), growth capped at 3x (+14 more)

### Community 54 - "config/tsconfig.json"
Cohesion: 0.09
Nodes (19): compilerOptions, rootDir, types, extends, include, bun, src/**/*, tests/**/* (+11 more)

### Community 55 - "audio-duration.ts"
Cohesion: 0.15
Nodes (17): setMessageAudio(), storeAudio(), BITRATES_V1_L3, BITRATES_V2_L3, findNextFrame(), Frame, isAnchored(), matches() (+9 more)

### Community 56 - "selfie.ts"
Cohesion: 0.19
Nodes (20): getCharacterAvatar(), uploadReferenceImage(), meansNobody(), oneLine(), ASPECT_FOR, captionFor(), composeShot(), ensureFaceReference() (+12 more)

### Community 57 - "Four tiers of memory"
Cohesion: 0.11
Nodes (20): CUDA runtime is a separate download, Kokoro-FastAPI voice server, llama.cpp server with L3-8B-Stheno, Local AI stack (LLM, TTS, image), Port 5000 is reserved by Hyper-V, Tier 2 chronicle summaries, Recall stays quiet rather than guessing, Tier 4 lorebook with affinity gating (+12 more)

### Community 58 - "doctor.ts"
Cohesion: 0.19
Nodes (19): androidSdkRoot(), CHECK_ONLY, checkAndroid(), checkBun(), checkJava(), checkNode(), checkWorkspaceInstall(), decode() (+11 more)

### Community 59 - "canvas/services/font-registry.ts"
Cohesion: 0.18
Nodes (17): BUNDLED_FONT_ALIASES, faceUrlsFor(), familyBaseName(), fileExtensionFor(), FontDefinition, getInstalledFontFamilies(), initializeFonts(), InstalledFontFamily (+9 more)

### Community 60 - "proactive-worker.ts"
Cohesion: 0.19
Nodes (16): buildQueueConnection(), describeQueueConnection(), queueConnection(), QueueConnectionOptions, selectedDatabase(), ProactiveJob, ProactiveJobData, AnyWorker (+8 more)

### Community 61 - "photo-ideas.ts"
Cohesion: 0.20
Nodes (16): clip(), distinct(), echoes(), extractIdeas(), FALLBACK_IDEAS, fill(), FILLER_WORDS, generatePhotoIdeas() (+8 more)

### Community 62 - "Pairing flow, host plus token"
Cohesion: 0.12
Nodes (19): Android cleartext HTTP blocked since API 28, initStorage persistence fallback, services/haptics.ts lazy require, expo-build-properties writes cleartext traffic, getPairingHost single advertised address, The deployed conductor is a shell, the local one serves, PUBLIC_URL advertised pairing host, Scheme derived from the host, not assumed (+11 more)

### Community 63 - "release.ts"
Cohesion: 0.14
Nodes (18): argv, built, capture(), describe(), DRY_RUN, fail(), generateNotes(), has() (+10 more)

### Community 64 - "chat-photos.ts"
Cohesion: 0.18
Nodes (15): PhotoRequestSheetProps, PhotoAction, PhotoFlow, SAVE_ERRORS, usePhotoFlow(), extensionFor(), loadMediaLibrary(), MediaLibraryModule (+7 more)

### Community 65 - "font-picker-modal.tsx"
Cohesion: 0.20
Nodes (15): FontPickerModal(), FontPickerModalProps, LocalRow, RemoteRow, Row, HEAVY_SUBSETS, isHeavyFamily(), loadFontPreview() (+7 more)

### Community 66 - "enhance.ts"
Cohesion: 0.25
Nodes (16): buildEnhancePrompt(), canAddAction(), enhanceMessage(), attempt(), EnhanceOptions, EnhanceUnavailableError, hasAction(), isQuestion() (+8 more)

### Community 67 - "tasks"
Cohesion: 0.11
Nodes (17): ^build, dependsOn, outputs, cache, persistent, dist/**, .expo/**, persistent (+9 more)

### Community 68 - "CHANGELOG — release notes parsed by scripts/release.ts"
Cohesion: 0.13
Nodes (17): Eidolon Agent Guidelines & Monorepo Rules, Resilient LLM Parsing (jsonrepair), Release v1.0.1, Parse LLM output only when it contains a real bracketed array, Scene fields cut to eight words; a clause-shaped others is dropped, Enforce in code rather than ask politely in a prompt, Chronicle summariser with a response_format JSON schema, Insight mode (trust score, tier, affinity pill) (+9 more)

### Community 69 - "chat-types.ts"
Cohesion: 0.24
Nodes (13): Transcript, ActiveStatus, AudioAttachment, ChatMessage, MindState, CharacterLook, ChatStore, ChatView (+5 more)

### Community 70 - "scripts"
Cohesion: 0.12
Nodes (15): main, name, private, scripts, android, build:aab, build:apk, build:apk:dev (+7 more)

### Community 71 - "gpu-worker.ts"
Cohesion: 0.25
Nodes (15): nextChapterIndex(), addPortrait(), isChronicleSummaryJob(), isPortraitJob(), isStageBackdropJob(), backdropFilename(), createGpuWorker(), NEWLINE (+7 more)

### Community 72 - "prompts.ts"
Cohesion: 0.28
Nodes (8): AUTHORING_PROMPTS, MEDIA_PROMPTS, MEMORY_PROMPTS, PERSONA_PROMPTS, PROMPT_DEFAULTS, PROMPT_KEYS, PromptDefinition, WRITING_PROMPTS

### Community 73 - "canvas/store/connection.ts"
Cohesion: 0.17
Nodes (12): onSocketRetry(), resetSocketBackoff(), SocketStatus, pingHealth(), verifyPairing(), ConnectionState, ConnectionStore, normalizeHost() (+4 more)

### Community 74 - "session.ts"
Cohesion: 0.18
Nodes (11): cards, ownerId(), requireOwner(), auth, bearer(), ensureLocalOwner(), Owner, ownerFor() (+3 more)

### Community 75 - "Theme Studio and Theme & Font Lab"
Cohesion: 0.13
Nodes (15): Viewport spike: media queries reflow without reload on web, Google serves CJK Noto faces as .otf, not .ttf, previewKey remount workaround for the style cache, Theme Studio responsiveness and late-applying edits, Publish theme variables through VariableContextProvider, lockToCharacter opens the theme studio in character scope, Google Fonts browser with lazy cached previews, Theme Studio and Theme & Font Lab (+7 more)

### Community 76 - "AFFINITY.tiers ladder owned by code"
Cohesion: 0.13
Nodes (14): AFFINITY.tiers ladder owned by code, appraiseTurn schema-constrained appraisal, db to affinity to prompts import cycle, mind_update state block, Mood and delta reconciled by valence, nextMindState applied-delta arithmetic, persona-guard.ts token-stream filter, Bracket stop sequence blocked mind_update (+6 more)

### Community 77 - "services/comfy-workflow.ts graph builder"
Cohesion: 0.13
Nodes (15): ComfyUI with RealVisXL V5.0 Lightning, PuLID face identity nodes, echoes overlap dedupe, isUsable idea reject rules, PARROTS known parroted phrases, services/comfy-workflow.ts graph builder, services/comfyui.ts real client, firstCaption whole-sentence budget (+7 more)

### Community 78 - "The local AI stack setup guide"
Cohesion: 0.15
Nodes (15): EIDOLON_AI_ROOT server location, stack/ moves into the repository, stack:down must wait with spawnSync, stack:panes single Windows Terminal window, bun run stack:up and stack:status, stack/start-embed.bat dedicated embedder, Vector width discovered and rebuilt on change, The 10x slowdown was VRAM, not the flag (+7 more)

### Community 79 - "Eidolon Logo 192x192 (PWA Icon)"
Cohesion: 0.23
Nodes (14): Amber to Deep Orange Gradient Palette, Android Adaptive Icon Foreground, Companion Persona Identity, Eidolon Brand Mark, Female Profile in Negative Space, Female Profile Silhouette Motif, Letter E Monogram Form, Serif Letter E Monogram (+6 more)

### Community 80 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, noEmit, paths, rootDir, types, extends, include, bun (+5 more)

### Community 81 - "getPrompt"
Cohesion: 0.30
Nodes (13): getPrompt(), appraisalPrompt(), block(), buildChatMessages(), buildSystemPrompt(), CharacterCard, freshLineReminder(), hardenedReminder() (+5 more)

### Community 82 - "stage-directions.ts"
Cohesion: 0.26
Nodes (10): ActionGate, createActionGate(), close(), hasAction(), isActionChunk(), isBeat(), limitActions(), wordCount() (+2 more)

### Community 83 - "Project state snapshot"
Cohesion: 0.14
Nodes (14): Release builds signed with the debug keystore, Dedicated authenticated pair/verify endpoint, Authenticated pairing, live socket, and the font system, Real WebSocket client with 1s-30s backoff reconnect, lint cannot pass on Windows without a .gitattributes, services/websocket.ts as sole owner of the conductor socket, Streaming chat engine and roleplay surface, scripts/auth-migrate.ts instead of the better-auth CLI (+6 more)

### Community 84 - "ThemeTokens published as CSS variables"
Cohesion: 0.14
Nodes (14): Fonts committed into the binary, EIDOLON_DATA_DIR outside the repository, eidolon-data named volume, The desktop app is a client, not a host, The desktop application, One codebase through react-native-web, Phase 0, make the web target real again, Two conductors on one LanceDB is data loss (+6 more)

### Community 85 - "Android APK: 136.5 MB to 42.9 MB"
Cohesion: 0.17
Nodes (13): Never hand-edit apps/canvas/android/, Never import the icon barrel, ABI restricted to arm64-v8a, Android APK: 136.5 MB to 42.9 MB, Per-icon imports instead of the hugeicons barrel, R8 minification and resource shrinking, with-android-build-optimizations config plugin, Trap 4: apps/canvas/android/ is regenerated by every build (+5 more)

### Community 86 - "Conductor character surface routes"
Cohesion: 0.15
Nodes (13): getCharacterName replaces hardcoded label, expo-media-library native module trap, character_portraits table, a portrait is a row, Character gallery with isAvatar pointer, rowid as ordering tiebreaker, ensureFaceReference face bootstrap, characters.face_url separate from the avatar, Selfies through ComfyUI and PuLID (+5 more)

### Community 87 - "protocol/package.json"
Cohesion: 0.15
Nodes (12): dependencies, zod, exports, main, name, private, scripts, test (+4 more)

### Community 88 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, isolatedModules, module, moduleResolution, noImplicitAny, resolveJsonModule, skipLibCheck (+4 more)

### Community 89 - "voice-picker.tsx"
Cohesion: 0.29
Nodes (9): RowProps, VoicePicker(), VoicePickerProps, fetchVoicePreview(), fetchVoices(), matchesSearch(), Voice, VoiceCatalogue (+1 more)

### Community 90 - "use-suggestions.ts"
Cohesion: 0.21
Nodes (7): SuggestionActions, useSuggestions(), hasSuggestions(), isSuggestionTrayVisible(), TrayState, IDLE, sent

### Community 91 - "google-fonts.ts"
Cohesion: 0.30
Nodes (10): cacheUri(), fetchFontCatalogue(), FontCatalogueError, getApiKey(), GoogleFontsError, hasGoogleFontsApiKey(), normalise(), readDiskCache() (+2 more)

### Community 92 - "§15 Configuration lives in @eidolon/config"
Cohesion: 0.18
Nodes (12): API versioning, a config package, and no more comments, @eidolon/config workspace package, An installed app is not a page that reloads with the server, apps/conductor/src/api/v1.ts router mounted at /api/v1/, An unset backend is a supported configuration, PROMPT_BUDGET covering the whole prompt, newest history first, Budget derived from the worst-case chars/token of arbitrary bytes, Transcript read timeout raised from six seconds to twenty (+4 more)

### Community 93 - "Character card fields reaching the prompt"
Cohesion: 0.17
Nodes (12): READER_LABEL colon-only match, CHAT_TURN.readerTurnStops, stripSpeakerLabel, Transcript-shaped examples teach the label, A blank card falls back to the assistant voice, Character card fields reaching the prompt, Example dialogue as the voice lever, Rules kept apart from personality (+4 more)

### Community 94 - "Eidolon: local-first AI companion"
Cohesion: 0.24
Nodes (11): Android Design Language (@eidolon/tokens), Bull-Board at /admin/queues themed with @eidolon/tokens, Interface copy stops using implementation language, apps/canvas — Expo / React Native client, apps/conductor — Bun + Hono gateway, bun run doctor — toolchain preflight, Eidolon: local-first AI companion, packages/protocol — Zod message schemas (+3 more)

### Community 95 - "metro.config.js"
Cohesion: 0.20
Nodes (10): config, dequeue(), fs, { getDefaultConfig }, os, path, readQueue, throttledRead() (+2 more)

### Community 96 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, babel-preset-expo, lightningcss, postcss, @tailwindcss/postcss, @types/react, babel-preset-expo, lightningcss (+3 more)

### Community 97 - "card-api.ts"
Cohesion: 0.24
Nodes (10): cardExportUrl(), CardPick, fileField(), ImportBody, ImportedCharacter, ImportResult, importTavernCard(), characterExportUrl() (+2 more)

### Community 98 - "comfy-workflow.ts"
Cohesion: 0.22
Nodes (9): buildImageWorkflow(), dimensionsFor(), Graph, Node, Orientation, WorkflowRequest, Selfie, SelfieRequest (+1 more)

### Community 99 - "conductor/tsconfig.json"
Cohesion: 0.18
Nodes (10): compilerOptions, paths, rootDir, types, extends, include, bun, src/**/* (+2 more)

### Community 100 - "S3-compatible storage service (initStorage, uploadImage, uploadAudio)"
Cohesion: 0.18
Nodes (11): EIDOLON_DATA_DIR points databases at the mounted volume, Object storage deliberately outside the deployment compose, Cloudflare caches 200s and 404s; generated media needs unique keys, A repository should be disposable, forcePathStyle is not optional for self-hosted gateways, OS-level persistent data directory resolution, PutBucketPolicy re-applied on every boot, not only on CreateBucket, S3-compatible storage service (initStorage, uploadImage, uploadAudio) (+3 more)

### Community 101 - "services/stage-directions.ts — one cap enforced everywhere"
Cohesion: 0.20
Nodes (11): Generated reply suggestions with normalizeSuggestions, hitSlop larger than the gap hands taps to the last-rendered sibling, Suggestions move behind the lightning button, createActionGate buffers asterisks during streaming, Actions stop eating the reply, shapeSuggestion and capActions limit actions in the reply tray, services/stage-directions.ts — one cap enforced everywhere, The client ignores text_replace, so corrections must happen before emit (+3 more)

### Community 102 - "config/package.json"
Cohesion: 0.18
Nodes (10): exports, ./server, main, name, private, scripts, test, typecheck (+2 more)

### Community 103 - "stack.ts"
Cohesion: 0.31
Nodes (9): isHealthy(), launch(), report(), Service, SERVICES, START, status(), up() (+1 more)

### Community 104 - "mind-block.ts"
Cohesion: 0.31
Nodes (8): hasMindBlock(), MindBlock, normalizeMemory(), normalizeMood(), parseMindBlock(), stripMindBlock(), sayItOutLoud(), NEWLINE

### Community 105 - "ninja 'manifest build.ninja still dirty' 260-char path failure"
Cohesion: 0.22
Nodes (10): CMake staging relocated to .native-build/, ninja 'manifest build.ninja still dirty' 260-char path failure, Bun's isolated store breaks a partial node_modules copy, Two-stage Bun Dockerfile built from the repo root, Containerise the conductor and deploy it on Coolify, Coolify docker_compose_domains takes an array, not the stored map, Dropping LanceDB's embedding stack (onnxruntime, transformers), expo-av rejected in favour of expo-audio (+2 more)

### Community 106 - "Reply suggestion generator"
Cohesion: 0.20
Nodes (10): EventSourceParserStream SSE parsing, Three separate causes of hallucination, One option per call with asterisk prefill, streamChatCompletion, Reply suggestion generator, extractIdeas multi-array parsing, A concrete example is a line the model will copy, Conversation-derived photo ideas (+2 more)

### Community 107 - "Multi-tier search ladder in services/search.ts"
Cohesion: 0.22
Nodes (10): searchWeb against a dead SearXNG instance, DuckDuckGo primary tier, exa.ai keyed fallback, formatSearchResults HTML stripping, Search is an enrichment, never fatal, Multi-tier search ladder in services/search.ts, SearXNG removed rather than kept as a tier, serper.dev keyed fallback (+2 more)

### Community 108 - "tsconfig.json"
Cohesion: 0.20
Nodes (9): ./packages/tsconfig/base.json, scripts/**/*.ts, compilerOptions, noEmit, types, extends, include, bun (+1 more)

### Community 109 - "apk.ts"
Cohesion: 0.20
Nodes (7): BUILT, CANVAS, OUT_DIR, ROOT, skipBuild, source, target

### Community 110 - "AqueousPool.tsx"
Cohesion: 0.25
Nodes (8): AqueousPool(), AqueousPoolProps, EASE_OUT, FIELD_PX, Ring(), RingProps, RINGS, ringWeight()

### Community 111 - "conductor/package.json"
Cohesion: 0.22
Nodes (8): name, private, scripts, dev, lint, test, typecheck, version

### Community 112 - "photo-caption.ts"
Cohesion: 0.39
Nodes (7): captionLine(), CaptionRequest, firstCaption(), NOT_A_CAPTION, shorten(), usableCaption(), askInVoice()

### Community 113 - "packages/config/src/copy.ts shared vocabulary"
Cohesion: 0.22
Nodes (9): Dragonfly prompt cache layer, Prompt catalogue in @eidolon/config, One-hour in-memory result cache, packages/config/src/copy.ts shared vocabulary, humanPairingError known-message passthrough, Copy needs no pronoun at all, STATUS_COPY single status table, eidolon-cache Dragonfly service (+1 more)

### Community 114 - "tokens/package.json"
Cohesion: 0.22
Nodes (8): exports, main, name, private, scripts, typecheck, types, version

### Community 115 - "stack-nav.test.ts"
Cohesion: 0.36
Nodes (4): matches(), openMode, StackRoute, roster

### Community 116 - "with-android-build-optimizations.js"
Cohesion: 0.25
Nodes (4): fs, GRADLE_PROPERTIES, path, {
  withDangerousMod,
  withGradleProperties,
  withSettingsGradle,
}

### Community 118 - "photo-line.ts"
Cohesion: 0.50
Nodes (6): asPhotoNote(), forHistory(), isPhotoLine(), photoLine(), SENT_A_PHOTO, isActionOnly()

### Community 119 - "reply-length.ts"
Cohesion: 0.46
Nodes (6): countSentences(), hasSaidEnough(), isInsideAction(), normalise(), repeatsHistory(), CHAT_TURN

### Community 120 - "fontScale publishes explicit --text-* pixel values rather than scaling rem"
Cohesion: 0.25
Nodes (8): rem is 14 on native and 16 in the DOM — name the breakpoint, never the pixel, fontScale publishes explicit --text-* pixel values rather than scaling rem, expo-file-system fallback storage: exports map and textSync(), Chat surface theme audit: named type steps and theme.radius, A try/catch around a require turns resolution failure into a silent capability downgrade, Trap 15: arbitrary Tailwind sizes bypass fontScale, Trap 16: MMKV namespaces its web keys, Trap 27: the storage fallback used to persist nothing on a device

### Community 121 - "character.ts"
Cohesion: 0.25
Nodes (7): EidolonMetadata, EidolonMetadataSchema, TavernV2Card, TavernV2CardSchema, TavernV2CharacterData, TavernV2CharacterDataSchema, TavernV2Metadata

### Community 122 - "use-chat-view.ts"
Cohesion: 0.43
Nodes (5): useChatView(), projectChat(), message(), open(), viewOf()

### Community 123 - "proactive.ts"
Cohesion: 0.38
Nodes (6): nextSilenceMs(), scheduleProactiveFollowUp(), enqueueProactiveJob(), proactiveQueue, ProactiveMessageJob, PROACTIVE

### Community 124 - "devDependencies"
Cohesion: 0.29
Nodes (7): @biomejs/biome, devDependencies, @biomejs/biome, turbo, @types/bun, typescript, turbo

### Community 125 - "GET /api/v1/characters/:id/gallery merging three image sources"
Cohesion: 0.29
Nodes (7): The saved avatar crop travels with the character everywhere, Gallery picture actions and Find it in the chat, Back reaches the roster, the pager stops eating pinches, and the fields move off the edge, openMode in lib/stack-nav.ts decides push vs replace vs dismissTo, A profile page, and everywhere the pictures went, GET /api/v1/characters/:id/gallery merging three image sources, Merge in SQL so LIMIT and OFFSET apply to the sorted result

### Community 126 - "Background work moves onto BullMQ queues"
Cohesion: 0.29
Nodes (7): On-demand portrait re-render queued and picked up by polling, Background work moves onto BullMQ queues, eidolon-gpu queue, concurrency 1, jobKey() sanitises deterministic job IDs (no colons), eidolon-proactive queue, concurrency 2, eidolon-s3-upload queue, concurrency 4, Work a reader is not waiting on belongs off the turn

### Community 127 - "completeText raw completions endpoint"
Cohesion: 0.29
Nodes (7): ENHANCE.actionChance on statements only, A clean failure beats a confident wrong answer, completeText raw completions endpoint, enhance_message rework flow, enhanceHistory undo stack, Temperature 0.2 makes a rewrite a rewrite, Prompt tuning on an 8B is not monotonic

### Community 128 - "src/roleplay.ts"
Cohesion: 0.43
Nodes (5): hasInfluence(), INFLUENCE_CLOSE, INFLUENCE_OPEN, isDirection(), splitInfluence

### Community 129 - "check-file-size.ts"
Cohesion: 0.29
Nodes (6): failures, KNOWN_DEBT, Offender, offenders, SEARCH_ROOTS, SHOW_ALL

### Community 130 - "theme-css-vars.ts"
Cohesion: 0.47
Nodes (5): fontVariant(), scaledTextSizes(), TEXT_SCALE_BASE_PX, tokensToCssVars(), cssVarsFor()

### Community 131 - "PAIRING_SECRET — the only gate on the WebSocket"
Cohesion: 0.40
Nodes (6): PAIRING_SECRET has no default; validateToken refuses every token when blank, Trap 26: Android blocks cleartext HTTP in a release build, Trap 9: EXPO_PUBLIC_* is inlined into the bundle, EXPO_PUBLIC_* values are inlined into the bundle, PAIRING_SECRET — the only gate on the WebSocket, §9 Secrets: EXPO_PUBLIC_* and PAIRING_SECRET

### Community 132 - "§18 Motion is designed, gated, and measured"
Cohesion: 0.33
Nodes (6): Reduced motion means gentler, not absent, hover: is unconditional on native react-native-css, splitTrailingWord: one animated node per effect, not per token, Absolutely positioned childless segment pill and a crossfading body, Frequency tier and purpose gate for animation, §18 Motion is designed, gated, and measured

### Community 133 - "png-chunks.d.ts"
Cohesion: 0.40
Nodes (4): png-chunk-text, png-chunks-encode, png-chunks-extract, PngChunk

### Community 134 - "Pairing screen redesign (pairing/page.ts)"
Cohesion: 0.40
Nodes (5): Pairing screen redesign (pairing/page.ts), Live pairing status pill backed by open socket count, Browser-rendered pairing QR, src/ws/registry.ts socket registry for worker-side pushes, Trap 8: terminal QR cannot carry a correct quiet zone

### Community 135 - "§11 Report honestly"
Cohesion: 0.50
Nodes (4): Verify before reporting, A silent no-op edit after Biome reformatting, caught only by typecheck, lastError is set in four places and rendered in none, §11 Report honestly

### Community 138 - "Desktop Phase 0: make the web target real again"
Cohesion: 0.50
Nodes (4): Desktop Phase 0: make the web target real again, lightningcss pin aligned down to the unexplained root pin, react-native-web 0.19.13 to 0.21.2 peer alignment, One codebase through react-native-web inside a Tauri v2 shell

### Community 139 - "Trap 24: audio_chunk arrives before the assistant message is committed"
Cohesion: 0.50
Nodes (4): clearAutoPlay: the token is consumed by the play that uses it, status_update idle with detail check commits the turn, Trap 24: audio_chunk arrives before the assistant message is committed, Trap 10: no turn_complete event; a turn ends on status_update idle

### Community 140 - "PaintingCard calm placeholder loader"
Cohesion: 0.50
Nodes (4): PaintingCard calm placeholder loader, ComfyUI binary preview frames, A dropped socket must end the turn, Loading skeletons shaped like their screens

### Community 141 - "Gestures do not cross a Modal boundary"
Cohesion: 0.50
Nodes (4): Gestures do not cross a Modal boundary, Gallery pinch, pan and double-tap zoom, Android will not clip a transformed child, Avatar crop as a region of the photo

### Community 142 - "§10 Every change set is recorded"
Cohesion: 0.67
Nodes (3): Record every change set, §10 Every change set is recorded, §16 No comments

### Community 143 - "@eidolon/protocol"
Cohesion: 0.67
Nodes (3): @eidolon/protocol, @eidolon/protocol, @eidolon/protocol

### Community 144 - "es-toolkit"
Cohesion: 0.67
Nodes (3): es-toolkit, es-toolkit, es-toolkit

### Community 146 - "Trap 12: FlashList v2 removed estimatedItemSize"
Cohesion: 0.67
Nodes (3): maintainVisibleContentPosition replaces estimatedItemSize, Trap 12: FlashList v2 removed estimatedItemSize, Trap 28: a player inside a FlashList cell dies on recycle

### Community 147 - "Angle-bracket nudge syntax"
Cohesion: 0.67
Nodes (3): Angle-bracket nudge syntax, Influence directives, one-way steering, splitInfluence deterministic nudge removal

### Community 148 - "feed-scroll.ts trackLiveEdge"
Cohesion: 0.67
Nodes (3): Live-edge scroll following, drawDistancePx raised to 1400, feed-scroll.ts trackLiveEdge

### Community 149 - "Mind and Lorebook drawer"
Cohesion: 0.67
Nodes (3): characters.affinity_locked author override, WCAG 2.2 dragging-alternative slider, Mind and Lorebook drawer

### Community 150 - "Trap 19: platform_machine == 'x86_64' never matches on Windows"
Cohesion: 0.67
Nodes (3): Trap 17: llama.cpp Windows CUDA zip omits the CUDA runtime, Trap 19: platform_machine == 'x86_64' never matches on Windows, Trap 18: Windows reserves TCP 4903-5002 for Hyper-V/WSL

## Ambiguous Edges - Review These
- `Reusable defs Path id="a" (Small Teardrop Sliver)` → `Flowing Hair Ribbon Strokes`  [AMBIGUOUS]
  public/logo.svg · relation: conceptually_related_to
- `Letter E Monogram Silhouette` → `Negative-Space Female Face in Profile`  [AMBIGUOUS]
  public/logo.png · relation: semantically_similar_to
- `Eidolon Brand Identity: A Speaking Apparition` → `Speaking AI Companion Persona`  [AMBIGUOUS]
  public/logo.webp · relation: conceptually_related_to
- `Android Adaptive Icon Foreground` → `Letter E Monogram Form`  [AMBIGUOUS]
  public/logo_512x512.png · relation: references
- `PWA / Android Launcher Icon Asset (192px)` → `Voice Companion Product Identity`  [AMBIGUOUS]
  public/logo_192x192.png · relation: conceptually_related_to
- `Missing .gitattributes and core.autocrlf line endings` → `lint cannot pass on Windows without a .gitattributes`  [AMBIGUOUS]
  changelog/2026/09/2026-09-05-state-out-of-the-repo.md · relation: semantically_similar_to

## Knowledge Gaps
- **789 isolated node(s):** `SuggestionRowProps`, `AppIconProps`, `ColorPickerModalProps`, `ThemeScope`, `ThemeScopeSelectorProps` (+784 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 996 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **54 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Reusable defs Path id="a" (Small Teardrop Sliver)` and `Flowing Hair Ribbon Strokes`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Letter E Monogram Silhouette` and `Negative-Space Female Face in Profile`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Eidolon Brand Identity: A Speaking Apparition` and `Speaking AI Companion Persona`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Android Adaptive Icon Foreground` and `Letter E Monogram Form`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._
- **What is the exact relationship between `PWA / Android Launcher Icon Asset (192px)` and `Voice Companion Product Identity`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Missing .gitattributes and core.autocrlf line endings` and `lint cannot pass on Windows without a .gitattributes`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `dependencies` connect `dependencies` to `dependencies`, `@eidolon/protocol`, `es-toolkit`, `expo`, `class-variance-authority`, `clsx`, `expo`, `expo-audio`, `expo-build-properties`, `expo-camera`, `expo-file-system`, `expo-font`, `expo-linear-gradient`, `expo-media-library`, `expo-status-bar`, `@hugeicons/core-free-icons`, `react-dom`, `react-native`, `react-native-gesture-handler`, `react-native-keyboard-controller`, `react-native-mmkv`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-svg`, `react-native-web`, `@rn-primitives/dropdown-menu`, `@rn-primitives/slot`, `@rn-primitives/types`, `@shopify/flash-list`, `tailwind-merge`, `zustand`, `scripts`?**
  _High betweenness centrality (0.074) - this node is a cross-community bridge._