# Graph Report - eidolon  (2026-09-07)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 2969 nodes · 6872 edges · 204 communities (145 shown, 58 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 180 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9e78d578`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- demo.tsx
- chat/[id].tsx
- CharacterSettingsSheet.tsx
- theme-store.ts
- icon.tsx
- config/src/index.ts
- useResolvedTheme
- chat-turn.ts
- reply-stream.ts
- scripts
- api.ts
- enhance.ts
- api/characters.ts
- dependencies
- server.ts
- PhotoViewer.tsx
- affinity.ts
- lancedb.ts
- includes
- server/index.ts
- db/index.ts
- characters/[id].tsx
- dependencies
- tts.ts
- prompt-builder.ts
- card-parser.test.ts
- websocket.ts
- chronicle.ts
- s3-worker.ts
- gpu-worker.ts
- conductor/src/index.ts
- live-voice.ts
- queues.ts
- comfyui.ts
- Multi-tier search ladder in services/search.ts
- Eidolon Logo Mark (public/logo.png)
- lorebook.test.ts
- suggestions.ts
- RoleplayText.tsx
- search.ts
- compilerOptions
- protocol/src/index.ts
- selfie.ts
- services/storage.ts
- POST /api/v1/characters/author — field, mode, draft, context
- Release v1.1.0
- config/tsconfig.json
- call-store.ts
- safeJsonParse
- getPrompt
- page.ts
- ChatFeed.tsx
- chat-store.ts
- chat-api.ts
- card-parser.ts
- photo-look.ts
- store.ts
- doctor.ts
- expo
- font-picker-modal.tsx
- canvas/services/font-registry.ts
- store/storage.ts
- proactive-worker.ts
- The local AI stack setup guide
- release.ts
- v1.ts
- photo-ideas.ts
- client.ts
- tasks
- PortraitStudio.tsx
- chat-types.ts
- reply-length.ts
- AFFINITY.tiers ladder owned by code
- Eidolon: local-first AI companion
- scripts
- typescript
- §15 Configuration lives in @eidolon/config
- Reply suggestion generator
- prompts.ts
- chat-messages.ts
- stage-directions.ts
- services/comfy-workflow.ts graph builder
- ThemeTokens published as CSS variables
- Eidolon Logo 192x192 (PWA Icon)
- CallScreen
- chat-photos.ts
- use-call-audio.ts
- compilerOptions
- conductor/package.json
- Project state snapshot
- S3-compatible storage service (initStorage, uploadImage, uploadAudio)
- Android APK: 136.5 MB to 42.9 MB
- devDependencies
- session.ts
- Local AI stack (LLM, TTS, image)
- protocol/package.json
- compilerOptions
- call/[id].tsx
- google-fonts.ts
- §18 Motion is designed, gated, and measured
- metro.config.js
- comfy-workflow.ts
- conductor/tsconfig.json
- CHANGELOG — release notes parsed by scripts/release.ts
- packages/config/src/copy.ts shared vocabulary
- Character card fields reaching the prompt
- config/package.json
- stack.ts
- ninja 'manifest build.ninja still dirty' 260-char path failure
- Trap 2: react-native-css caches computed styles per rule-set hash
- services/stage-directions.ts — one cap enforced everywhere
- tsconfig.json
- apk.ts
- AqueousPool.tsx
- photo-caption.ts
- Four tiers of memory
- tokens/package.json
- stack-nav.test.ts
- with-android-build-optimizations.js
- FallbackStorage
- chronicle-writer.ts
- fontScale publishes explicit --text-* pixel values rather than scaling rem
- character.ts
- android
- plugins
- card-api.ts
- devDependencies
- GET /api/v1/characters/:id/gallery merging three image sources
- completeText raw completions endpoint
- check-file-size.ts
- Eidolon Agent Guidelines & Monorepo Rules
- FallbackFile
- voice-api.ts
- PAIRING_SECRET — the only gate on the WebSocket
- png-chunks.d.ts
- §11 Report honestly
- avatar-crop.test.ts
- enhance-stack.test.ts
- Desktop Phase 0: make the web target real again
- Trap 24: audio_chunk arrives before the assistant message is committed
- initStorage persistence fallback
- PaintingCard calm placeholder loader
- Gestures do not cross a Modal boundary
- §10 Every change set is recorded
- with-dark-system-chrome.js
- Trap 12: FlashList v2 removed estimatedItemSize
- Angle-bracket nudge syntax
- feed-scroll.ts trackLiveEdge
- Mind and Lorebook drawer
- Trap 19: platform_machine == 'x86_64' never matches on Windows
- server.test.ts
- storage-env.ts
- Strict Biome Compliance
- Utility First (es-toolkit)
- Strict TypeScript & Zero any
- global.d.ts
- nativewind-env.d.ts
- clsx
- @eidolon/config
- @eidolon/protocol
- @eidolon/tokens
- expo
- expo-audio
- expo-document-picker
- expo-haptics
- expo-linear-gradient
- expo-linking
- expo-media-library
- expo-status-bar
- @hugeicons/react-native
- nativewind
- react
- react-dom
- react-native
- react-native-reanimated
- react-native-safe-area-context
- react-native-screens
- react-native-svg
- react-native-worklets
- @rn-primitives/dialog
- @rn-primitives/dropdown-menu
- @rn-primitives/slot
- @rn-primitives/types
- @shopify/flash-list
- tailwind-merge
- tailwindcss
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
6. `useChatStore` - 28 edges
7. `scripts` - 28 edges
8. `cn()` - 26 edges
9. `render()` - 26 edges
10. `useConnectionStore` - 26 edges

## Surprising Connections (you probably didn't know these)
- `plugins/with-dark-system-chrome.js` --semantically_similar_to--> `with-android-build-optimizations.js`  [INFERRED] [semantically similar]
  changelog/2026/09/2026-09-06-system-chrome-and-loading-states.md → docs/BUILD_ANDROID.md
- `The local AI stack setup guide` --semantically_similar_to--> `Local AI stack (LLM, TTS, image)`  [INFERRED] [semantically similar]
  stack/README.md → changelog/2026/09/2026-09-06-local-ai-stack.md
- `lint cannot pass on Windows without a .gitattributes` --semantically_similar_to--> `Missing .gitattributes and core.autocrlf line endings`  [AMBIGUOUS] [semantically similar]
  changelog/2026/09/2026-09-05-state-out-of-the-repo.md → LLM_STATE.md
- `Theme Studio responsiveness and late-applying edits` --conceptually_related_to--> `Theme Studio and Theme & Font Lab`  [INFERRED]
  changelog/2026/09/2026-09-05-theme-studio-responsiveness.md → CHANGELOG.md
- `Pairing flow, host plus token` --conceptually_related_to--> `humanPairingError known-message passthrough`  [INFERRED]
  docs/PAIRING.md → changelog/2026/09/2026-09-06-plain-language-and-a-calmer-loader.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Four tiers of memory feeding one prompt** — changelog_2026_09_2026_09_06_memory_lorebook_and_the_affinity_hud_workinghistory, changelog_2026_09_2026_09_06_memory_lorebook_and_the_affinity_hud_chronicle, changelog_2026_09_2026_09_06_memory_lorebook_and_the_affinity_hud_memory_manager, changelog_2026_09_2026_09_06_memory_lorebook_and_the_affinity_hud_lorebook, changelog_2026_09_2026_09_06_memory_lorebook_and_the_affinity_hud_prompt_builder [EXTRACTED 1.00]
- **Three inference servers resident on one GPU** — changelog_2026_09_2026_09_06_local_ai_stack_llama_cpp, changelog_2026_09_2026_09_06_local_ai_stack_comfyui, changelog_2026_09_2026_09_06_local_ai_stack_kokoro_fastapi, changelog_2026_09_2026_09_06_local_ai_stack_local_ai_stack [EXTRACTED 1.00]
- **Getting structure out of a small local roleplay model** — llm_state_constrained_decoding, llm_state_roleplay_finetune_meta_instructions, llm_state_jsonrepair_prose_to_array, llm_state_example_lines_copied_verbatim, llm_state_few_shot_false_memories, changelog_2026_09_2026_09_06_authoring_portrait_gallery_actions_example_copying_guards, changelog_2026_09_2026_09_06_bullmq_job_queues_chronicle_summariser [INFERRED 0.85]
- **Authenticated pairing flow, end to end** — changelog_2026_09_2026_09_05_pairing_and_fonts_authenticated_verify_endpoint, changelog_2026_09_2026_09_05_pairing_and_fonts_websocket_backoff_client, changelog_2026_09_2026_09_05_pairing_and_fonts_browser_rendered_qr, changelog_2026_09_2026_09_05_api_versioning_and_config_package_pairing_secret_no_default, llm_state_ws_401_before_upgrade, llm_state_android_cleartext_http [INFERRED 0.85]
- **Lifecycle of one streamed chat turn** — changelog_2026_09_2026_09_05_streaming_chat_engine_single_socket_owner, changelog_2026_09_2026_09_05_streaming_chat_engine_idle_commits_turn, changelog_2026_09_2026_09_06_actions_stop_eating_the_reply_action_gate, changelog_2026_09_2026_09_05_streaming_chat_engine_voice_note_stored_object, changelog_2026_09_2026_09_05_streaming_chat_engine_clear_auto_play, changelog_2026_09_2026_09_06_a_poisoned_transcript_and_a_bounded_prompt_prompt_budget [INFERRED 0.85]
- **Guards that check model output before it reaches the reader** — changelog_2026_09_2026_09_06_local_ai_stack_persona_guard, changelog_2026_09_2026_09_06_she_can_say_she_does_not_know_leaksinstruction, changelog_2026_09_2026_09_06_selfies_usablecaption, changelog_2026_09_2026_09_06_selfies_ispromptlike, changelog_2026_09_2026_09_06_photo_ideas_stop_parroting_the_prompt_isusable, changelog_2026_09_2026_09_07_presets_a_voice_and_a_roster_narratesinthirdperson, changelog_2026_09_2026_09_06_reader_label_and_back_stack_stripspeakerlabel [INFERRED 0.85]

## Communities (204 total, 58 thin omitted)

### Community 0 - "demo.tsx"
Cohesion: 0.05
Nodes (62): humanPairingError(), PairingScreen(), ACCENT_PRESETS, BORDER_PRESETS, CANVAS_PRESETS, CARD_PRESETS, RADIUS_PRESETS, SECONDARY_PRESETS (+54 more)

### Community 1 - "chat/[id].tsx"
Cohesion: 0.06
Nodes (49): AVATAR_ACTIONS, ChatScreen(), STATUS_LABEL, ACTIONS, ActionSpec, ActionsSheet(), ActionsSheetProps, ChatAction (+41 more)

### Community 2 - "CharacterSettingsSheet.tsx"
Cohesion: 0.08
Nodes (53): NewCharacterScreen(), CharacterFields(), CharacterFieldsProps, ALL_FIELDS, CharacterForm(), CharacterFormProps, BLURBS, SECTION_OPTIONS (+45 more)

### Community 3 - "theme-store.ts"
Cohesion: 0.08
Nodes (47): RootLayout(), DynamicDemoScreen(), ColorFieldProps, ThemeStudioSheet(), fontVariant(), scaledTextSizes(), TEXT_SCALE_BASE_PX, tokensToCssVars() (+39 more)

### Community 4 - "icon.tsx"
Cohesion: 0.08
Nodes (39): CallControlsProps, FieldAuthorRowProps, GalleryAction, GalleryActions(), GalleryActionsProps, ICONS, LABELS, PortraitSheetProps (+31 more)

### Community 5 - "config/src/index.ts"
Cohesion: 0.07
Nodes (40): PaintingCard(), PaintingCardProps, withAlpha(), mockMemory, AdminRoute, ApiRoute, AUTHOR_FIELD_KEYS, AUTHOR_FIELDS (+32 more)

### Community 6 - "useResolvedTheme"
Cohesion: 0.07
Nodes (36): MainCharactersScreen(), AudioNotePill(), AudioNotePillProps, AudioTabSkeleton(), AudioTabSkeletonProps, BAR_SCALES, WaveformBars(), WaveformBarsProps (+28 more)

### Community 7 - "chat-turn.ts"
Cohesion: 0.12
Nodes (31): appendMessage(), getCharacterCard(), getRecentMessages(), generatePhotoIdeas(), handleChatTurn(), handleRegenerateSuggestions(), handleEnhanceMessage(), ClientSessionManager (+23 more)

### Community 8 - "reply-stream.ts"
Cohesion: 0.10
Nodes (35): createPersonaFilter(), scan(), deflection(), findTell(), INSTRUCTION_KEYS, leaksInstruction(), normalizeForEcho(), opening() (+27 more)

### Community 9 - "scripts"
Cohesion: 0.05
Nodes (41): name, overrides, lightningcss, react-native-worklets, packageManager, private, resolutions, lightningcss (+33 more)

### Community 10 - "api.ts"
Cohesion: 0.12
Nodes (35): pingHealth(), verifyPairing(), API_PREFIX, API_VERSION, apiPath(), apiUrl(), characterAffinityPath(), characterAffinityUrl() (+27 more)

### Community 11 - "enhance.ts"
Cohesion: 0.11
Nodes (36): authoring, AuthorContext, authorField(), attempt(), AuthorUnavailableError, buildAuthorPrompt(), buildContext(), exampleAnswers() (+28 more)

### Community 12 - "api/characters.ts"
Cohesion: 0.12
Nodes (31): characters, Draft, mountCharacters(), TEXT_FIELDS, adopt(), CharacterCard, CharacterDraft, characterExists() (+23 more)

### Community 13 - "dependencies"
Cohesion: 0.05
Nodes (37): dependencies, @aws-sdk/client-s3, better-auth, @bull-board/api, @bull-board/hono, bullmq, duck-duck-scrape, @eidolon/config (+29 more)

### Community 14 - "server.ts"
Cohesion: 0.05
Nodes (36): AudioChunkEvent, AudioChunkSchema, AudioFormat, AudioFormatEnum, ErrorEvent, ErrorSchema, ImageAspectRatio, ImageAspectRatioEnum (+28 more)

### Community 15 - "PhotoViewer.tsx"
Cohesion: 0.10
Nodes (28): CallStage(), CallStageProps, PHASE_LINE, CharacterCardProps, CharacterRosterCard(), AvatarCrop(), AvatarCropProps, CharacterSettingsHeader() (+20 more)

### Community 16 - "affinity.ts"
Cohesion: 0.14
Nodes (30): AffinityOverride, applyAffinityOverride(), buildMindView(), ChapterView, LoreView, MindView, toChapterView(), getCharacterMind() (+22 more)

### Community 17 - "lancedb.ts"
Cohesion: 0.12
Nodes (30): aboveThreshold(), describeRecall(), ExchangeToRemember, formatExchange(), formatRecall(), lookUp(), NEWLINE, recallMemories() (+22 more)

### Community 18 - "includes"
Cohesion: 0.06
Nodes (34): css, parser, files, ignoreUnknown, includes, formatter, enabled, indentStyle (+26 more)

### Community 19 - "server/index.ts"
Cohesion: 0.14
Nodes (26): after, before, AUTH_BASE_URL, generatePairingPayload(), PAIRING_SECRET, validateToken(), authOptions, hasActiveSession() (+18 more)

### Community 20 - "db/index.ts"
Cohesion: 0.09
Nodes (26): gallery, countGallery(), currentAvatar(), GalleryImage, GalleryKind, listGallery(), Row, checkDatabaseHealth() (+18 more)

### Community 21 - "characters/[id].tsx"
Cohesion: 0.09
Nodes (24): Index(), CharacterProfileScreen(), GalleryGrid(), GalleryGridProps, KIND_ICON, GalleryViewer(), GalleryViewerProps, PortraitSheet() (+16 more)

### Community 22 - "dependencies"
Cohesion: 0.06
Nodes (33): dependencies, class-variance-authority, es-toolkit, expo-build-properties, expo-camera, expo-constants, expo-file-system, expo-font (+25 more)

### Community 23 - "tts.ts"
Cohesion: 0.10
Nodes (26): mountVoices(), voices, speakableText(), synthesizeSpeech(), isKnownVoice(), KokoroVoice, listVoices(), sortVoices() (+18 more)

### Community 24 - "prompt-builder.ts"
Cohesion: 0.13
Nodes (26): getActiveChronicle(), AssembleOptions, assemblePrompt(), clip(), estimateTokens(), fitHistory(), gatherWeb(), NEWLINE (+18 more)

### Community 25 - "card-parser.test.ts"
Cohesion: 0.17
Nodes (25): asRecord(), asString(), asStrings(), decodeItxt(), isCardKeyword(), parseCardBuffer(), readAffinityGate(), readCardData() (+17 more)

### Community 26 - "websocket.ts"
Cohesion: 0.11
Nodes (27): closeSocket(), ConductorSocket, configureSocket(), MessageListener, messageListeners, onSocketRetry(), openSocket(), publishMessage() (+19 more)

### Community 27 - "chronicle.ts"
Cohesion: 0.14
Nodes (24): countMessages(), getTranscript(), getStage(), batchForMilestone(), chapterForMilestone(), chronicleJobId(), isChronicleMilestone(), maybeSummarizeChronicle() (+16 more)

### Community 28 - "s3-worker.ts"
Cohesion: 0.13
Nodes (23): setMessageAudio(), processUploadJob(), storeAudio(), storeImage(), BITRATES_V1_L3, BITRATES_V2_L3, findNextFrame(), Frame (+15 more)

### Community 29 - "gpu-worker.ts"
Cohesion: 0.12
Nodes (24): appendChronicle(), ChronicleRow, getChronicles(), nextChapterIndex(), StoredChronicle, toChronicle(), setCharacterAvatar(), setCharacterFace() (+16 more)

### Community 30 - "conductor/src/index.ts"
Cohesion: 0.10
Nodes (20): v1, auth, pairingPayload, { port }, createQueueBoard(), eidolonTheme(), allQueues, closeQueues() (+12 more)

### Community 31 - "live-voice.ts"
Cohesion: 0.16
Nodes (19): ttsApiUrl(), concatMp3(), reportOffline(), silentMp3(), synthesizeSentence(), createSentenceBuffer(), take(), cutPoint() (+11 more)

### Community 32 - "queues.ts"
Cohesion: 0.15
Nodes (21): enqueueUploadJob(), gpuQueue, s3UploadQueue, GpuJobMap, GpuJobName, MediaUploadJob, ProactiveJobMap, ProactiveJobName (+13 more)

### Community 33 - "comfyui.ts"
Cohesion: 0.15
Nodes (23): COMFY_CLIENT_ID, connectComfyEvents(), handleBinary(), handleText(), PromptProgress, PromptWatcher, socketUrl(), watchers (+15 more)

### Community 34 - "Multi-tier search ladder in services/search.ts"
Cohesion: 0.09
Nodes (25): searchWeb against a dead SearXNG instance, DuckDuckGo primary tier, exa.ai keyed fallback, formatSearchResults HTML stripping, Search is an enrichment, never fatal, Multi-tier search ladder in services/search.ts, SearXNG removed rather than kept as a tier, serper.dev keyed fallback (+17 more)

### Community 35 - "Eidolon Logo Mark (public/logo.png)"
Cohesion: 0.16
Nodes (25): Eidolon Logo Mark (logo.svg), Auto-Traced Geometry: Only m/l/h/v/q/c/z, No Gradients or Strokes, Eidolon Brand Identity: Speaking Companion Persona, Reusable defs Path id="a" (Small Teardrop Sliver), Letter E Monogram Silhouette, Eidolon Brand Identity: A Speaking Apparition, Ember Palette: 135 Warm Orange Fills (#cc500f to #f8b922), Negative-Space Female Face in Profile (+17 more)

### Community 36 - "lorebook.test.ts"
Cohesion: 0.18
Nodes (19): ensureCharacter(), deleteLoreEntry(), getActiveLoreEntries(), getLoreEntries(), LoreRow, NewLoreEntry, StoredLoreEntry, toEntry() (+11 more)

### Community 37 - "suggestions.ts"
Cohesion: 0.19
Nodes (22): streamChatCompletion(), capActions(), cleanLine(), extractCandidates(), FALLBACK_SPOKEN, FALLBACK_WITH_ACTION, fallbackSuggestions(), firstLine() (+14 more)

### Community 38 - "RoleplayText.tsx"
Cohesion: 0.15
Nodes (20): DIALOGUE_CLASS, INFLUENCE_CLASS, NARRATION_CLASS, RoleplaySegments(), RoleplaySegmentsProps, RoleplayTextProps, SEGMENT_CLASS, segmentClass() (+12 more)

### Community 39 - "search.ts"
Cohesion: 0.12
Nodes (13): CacheEntry, clean(), formatSearchResults(), fromDuckDuckGo(), fromExa(), fromSerper(), searchCache, SearchResultItem (+5 more)

### Community 40 - "compilerOptions"
Cohesion: 0.09
Nodes (20): files, name, private, version, compilerOptions, allowSyntheticDefaultImports, jsx, module (+12 more)

### Community 41 - "protocol/src/index.ts"
Cohesion: 0.13
Nodes (11): sent, IDLE, sent, sent, ServerMessage, ServerMessageSchema, normalizeServerMessage(), parseClientMessage() (+3 more)

### Community 42 - "selfie.ts"
Cohesion: 0.17
Nodes (19): forgetLook(), oneLine(), isPromptLike(), ASPECT_FOR, captionFor(), composeShot(), faceNames, forgetFace() (+11 more)

### Community 43 - "services/storage.ts"
Cohesion: 0.19
Nodes (18): audioKey(), buildPublicReadPolicy(), characterKey(), deleteFile(), describe(), getS3Client(), imageKey(), initStorage() (+10 more)

### Community 44 - "POST /api/v1/characters/author — field, mode, draft, context"
Cohesion: 0.09
Nodes (22): Selector-scoped store reads instead of whole-store subscriptions, metaPhrases catches the paraphrase of a stage-direction reminder, A poisoned transcript, and a prompt that cannot overrun its context, Read-time leaksInstruction filter over stored assistant turns, POST /api/v1/characters/author — field, mode, draft, context, Writing a character with help, rendering her face on demand, and gallery actions, Deterministic guards against the model copying prompt examples, Rewriting is cold (0.35), suggesting is warm (0.8), growth capped at 3x (+14 more)

### Community 45 - "Release v1.1.0"
Cohesion: 0.10
Nodes (22): No unprompted APK builds, Breaking: every route under /api/v1/, S3-compatible object storage for media, Release v1.1.0, Media grouped by character prefix, plugins/with-dark-system-chrome.js, Changelog long-form format, Record measurements as numbers, not adjectives (+14 more)

### Community 46 - "config/tsconfig.json"
Cohesion: 0.09
Nodes (19): compilerOptions, rootDir, types, extends, include, bun, src/**/*, tests/**/* (+11 more)

### Community 47 - "call-store.ts"
Cohesion: 0.19
Nodes (17): CallSpeech, useCallSpeech(), describe(), joinSpoken(), SpeechCapture, useDeviceSpeech(), ServerSpeechOptions, useServerSpeech() (+9 more)

### Community 48 - "safeJsonParse"
Cohesion: 0.17
Nodes (15): getCurrentStage(), listStages(), registerStage(), StageRow, StoredStage, toStage(), hasMindBlock(), MindBlock (+7 more)

### Community 49 - "getPrompt"
Cohesion: 0.16
Nodes (19): AssembledPrompt, getPrompt(), ChatMessage, CompletionOptions, CompletionRequest, extractStructuredOutput(), LLM_API_URL, LLM_MODEL (+11 more)

### Community 50 - "page.ts"
Cohesion: 0.19
Nodes (18): BannerFacts, renderBanner(), renderPairingQr(), row(), rule(), copyRow(), renderPairingPage(), script() (+10 more)

### Community 51 - "ChatFeed.tsx"
Cohesion: 0.15
Nodes (12): ChatFeed(), ChatFeedProps, STATUS_LINE, ChatFeedEmpty(), ChatFeedEmptyProps, MessageCard, distanceFromBottom(), isWithinLiveEdge() (+4 more)

### Community 52 - "chat-store.ts"
Cohesion: 0.19
Nodes (15): useChatView(), SuggestionActions, useSuggestions(), isCallLive(), findLastAssistantId(), resolveUserTimezone(), hasSuggestions(), isSuggestionTrayVisible() (+7 more)

### Community 53 - "chat-api.ts"
Cohesion: 0.18
Nodes (15): formatClockTime(), formatDuration(), formatVoiceDuration(), wholeSeconds(), fetchTranscript(), forgetCharacter(), requestJson(), toMessage() (+7 more)

### Community 54 - "card-parser.ts"
Cohesion: 0.17
Nodes (18): CharacterLook, getCharacterAvatar(), getCharacterLook(), getCharacterPigment(), setCharacterAvatarCrop(), setCharacterBackground(), setCharacterPigment(), anchorKey() (+10 more)

### Community 55 - "photo-look.ts"
Cohesion: 0.15
Nodes (19): getCharacterAppearance(), setCharacterAppearance(), appearances, BODY_CHANGE, composeAppearance(), describeAppearance(), EMPTY_WORDS, FALLBACK_LOOK (+11 more)

### Community 56 - "store.ts"
Cohesion: 0.21
Nodes (17): definitions, describePrompt(), hydrate(), listPrompts(), loadPrompts(), memory, PromptRecord, readAllFromDb() (+9 more)

### Community 57 - "doctor.ts"
Cohesion: 0.19
Nodes (19): androidSdkRoot(), CHECK_ONLY, checkAndroid(), checkBun(), checkJava(), checkNode(), checkWorkspaceInstall(), decode() (+11 more)

### Community 58 - "expo"
Cohesion: 0.11
Nodes (18): expo, backgroundColor, icon, ios, name, orientation, scheme, slug (+10 more)

### Community 59 - "font-picker-modal.tsx"
Cohesion: 0.18
Nodes (16): FONT_PREVIEW_SAMPLE, FontPickerModal(), FontPickerModalProps, LocalRow, RemoteRow, Row, HEAVY_SUBSETS, isHeavyFamily() (+8 more)

### Community 60 - "canvas/services/font-registry.ts"
Cohesion: 0.18
Nodes (17): BUNDLED_FONT_ALIASES, faceUrlsFor(), familyBaseName(), fileExtensionFor(), FontDefinition, getInstalledFontFamilies(), initializeFonts(), InstalledFontFamily (+9 more)

### Community 61 - "store/storage.ts"
Cohesion: 0.13
Nodes (5): appStorage, initStorage(), KeyValueStorage, MMKVInstance, MMKVStorageWrapper

### Community 62 - "proactive-worker.ts"
Cohesion: 0.20
Nodes (16): buildQueueConnection(), describeQueueConnection(), queueConnection(), QueueConnectionOptions, selectedDatabase(), ProactiveJob, ProactiveJobData, createGpuWorker() (+8 more)

### Community 63 - "The local AI stack setup guide"
Cohesion: 0.12
Nodes (19): EIDOLON_AI_ROOT server location, stack/ moves into the repository, stack:down must wait with spawnSync, stack:panes single Windows Terminal window, bun run stack:up and stack:status, stack/start-embed.bat dedicated embedder, Vector width discovered and rebuilt on change, The 10x slowdown was VRAM, not the flag (+11 more)

### Community 64 - "release.ts"
Cohesion: 0.14
Nodes (18): argv, built, capture(), describe(), DRY_RUN, fail(), generateNotes(), has() (+10 more)

### Community 65 - "v1.ts"
Cohesion: 0.22
Nodes (11): buildHealthReport(), checkComfyHealth(), checkLlmHealth(), checkTranscribeHealth(), cleanTranscript(), isTranscriptionConfigured(), sttApiUrl(), transcribeAudio() (+3 more)

### Community 66 - "photo-ideas.ts"
Cohesion: 0.20
Nodes (15): clip(), distinct(), echoes(), extractIdeas(), FALLBACK_IDEAS, fill(), FILLER_WORDS, isUsable() (+7 more)

### Community 67 - "client.ts"
Cohesion: 0.11
Nodes (17): ChatTurnEvent, ChatTurnSchema, ClientMessageSchema, EnhanceMessageEvent, EnhanceMessageSchema, InterruptEvent, InterruptSchema, PingEvent (+9 more)

### Community 68 - "tasks"
Cohesion: 0.11
Nodes (17): ^build, dependsOn, outputs, cache, persistent, dist/**, .expo/**, persistent (+9 more)

### Community 69 - "PortraitStudio.tsx"
Cohesion: 0.18
Nodes (13): ImportCardButton(), ImportCardButtonProps, Stage, PortraitStudio(), PortraitStudioProps, Segmented(), SegmentedProps, HapticsModule (+5 more)

### Community 70 - "chat-types.ts"
Cohesion: 0.23
Nodes (15): MessageCardProps, Transcript, ActiveStatus, AudioAttachment, ChatMessage, MindState, CharacterLook, ChatSetter (+7 more)

### Community 71 - "reply-length.ts"
Cohesion: 0.24
Nodes (13): asPhotoNote(), forHistory(), isPhotoLine(), photoLine(), SENT_A_PHOTO, countSentences(), hasSaidEnough(), isActionOnly() (+5 more)

### Community 72 - "AFFINITY.tiers ladder owned by code"
Cohesion: 0.12
Nodes (16): AFFINITY.tiers ladder owned by code, appraiseTurn schema-constrained appraisal, db to affinity to prompts import cycle, EventSourceParserStream SSE parsing, mind_update state block, Mood and delta reconciled by valence, nextMindState applied-delta arithmetic, persona-guard.ts token-stream filter (+8 more)

### Community 73 - "Eidolon: local-first AI companion"
Cohesion: 0.15
Nodes (16): Android Design Language (@eidolon/tokens), Pairing screen redesign (pairing/page.ts), Live pairing status pill backed by open socket count, Browser-rendered pairing QR, Bull-Board at /admin/queues themed with @eidolon/tokens, src/ws/registry.ts socket registry for worker-side pushes, Interface copy stops using implementation language, Trap 8: terminal QR cannot carry a correct quiet zone (+8 more)

### Community 74 - "scripts"
Cohesion: 0.12
Nodes (15): main, name, private, scripts, android, build:aab, build:apk, build:apk:dev (+7 more)

### Community 75 - "typescript"
Cohesion: 0.13
Nodes (16): @types/bun, typescript, @types/bun, devDependencies, @eidolon/tsconfig, @types/bun, typescript, devDependencies (+8 more)

### Community 76 - "§15 Configuration lives in @eidolon/config"
Cohesion: 0.13
Nodes (16): API versioning, a config package, and no more comments, @eidolon/config workspace package, An installed app is not a page that reloads with the server, apps/conductor/src/api/v1.ts router mounted at /api/v1/, EIDOLON_DATA_DIR points databases at the mounted volume, A repository should be disposable, An unset backend is a supported configuration, OS-level persistent data directory resolution (+8 more)

### Community 77 - "Reply suggestion generator"
Cohesion: 0.12
Nodes (16): getCharacterName replaces hardcoded label, Three separate causes of hallucination, One option per call with asterisk prefill, Reply suggestion generator, echoes overlap dedupe, extractIdeas multi-array parsing, isUsable idea reject rules, A concrete example is a line the model will copy (+8 more)

### Community 78 - "prompts.ts"
Cohesion: 0.28
Nodes (8): AUTHORING_PROMPTS, MEDIA_PROMPTS, MEMORY_PROMPTS, PERSONA_PROMPTS, PROMPT_DEFAULTS, PROMPT_KEYS, PromptDefinition, WRITING_PROMPTS

### Community 79 - "chat-messages.ts"
Cohesion: 0.23
Nodes (10): isNarrationOnly(), reduceServerMessage(), attachAudioToLastAssistant(), audioChunkToAttachment(), ChatRole, createMessage(), createMessageId(), isLiveSentence() (+2 more)

### Community 80 - "stage-directions.ts"
Cohesion: 0.25
Nodes (11): ActionGate, createActionGate(), close(), hasAction(), isActionChunk(), isBeat(), limitActions(), stripActions() (+3 more)

### Community 81 - "services/comfy-workflow.ts graph builder"
Cohesion: 0.13
Nodes (15): expo-media-library native module trap, character_portraits table, a portrait is a row, Character gallery with isAvatar pointer, rowid as ordering tiebreaker, Background job queues and /admin/queues, services/comfy-workflow.ts graph builder, services/comfyui.ts real client, ensureFaceReference face bootstrap (+7 more)

### Community 82 - "ThemeTokens published as CSS variables"
Cohesion: 0.13
Nodes (15): Fonts committed into the binary, EIDOLON_DATA_DIR outside the repository, eidolon-data named volume, The desktop app is a client, not a host, The desktop application, One codebase through react-native-web, Phase 0, make the web target real again, Two conductors on one LanceDB is data loss (+7 more)

### Community 83 - "Eidolon Logo 192x192 (PWA Icon)"
Cohesion: 0.23
Nodes (14): Amber to Deep Orange Gradient Palette, Android Adaptive Icon Foreground, Companion Persona Identity, Eidolon Brand Mark, Female Profile in Negative Space, Female Profile Silhouette Motif, Letter E Monogram Form, Serif Letter E Monogram (+6 more)

### Community 84 - "CallScreen"
Cohesion: 0.22
Nodes (12): CallScreen(), useChatSocket(), getSocketStatus(), onServerMessage(), onSocketStatus(), useConductorSocket(), callElapsedSeconds(), fetchServices() (+4 more)

### Community 85 - "chat-photos.ts"
Cohesion: 0.21
Nodes (11): PhotoRequestSheetProps, PhotoAction, PhotoFlow, SAVE_ERRORS, extensionFor(), loadMediaLibrary(), MediaLibraryModule, savePhotoToDevice() (+3 more)

### Community 86 - "use-call-audio.ts"
Cohesion: 0.25
Nodes (12): CallAudio, playableUri(), sampleLevel(), useCallAudio(), CacheDirectory, cacheSpokenSentence(), clearSpokenSentences(), FileSystemModule (+4 more)

### Community 87 - "compilerOptions"
Cohesion: 0.14
Nodes (13): compilerOptions, noEmit, paths, rootDir, types, extends, include, bun (+5 more)

### Community 88 - "conductor/package.json"
Cohesion: 0.14
Nodes (13): devDependencies, @eidolon/tsconfig, @types/qrcode-terminal, typescript, name, private, scripts, dev (+5 more)

### Community 89 - "Project state snapshot"
Cohesion: 0.14
Nodes (14): Release builds signed with the debug keystore, Dedicated authenticated pair/verify endpoint, Authenticated pairing, live socket, and the font system, Real WebSocket client with 1s-30s backoff reconnect, lint cannot pass on Windows without a .gitattributes, services/websocket.ts as sole owner of the conductor socket, Streaming chat engine and roleplay surface, scripts/auth-migrate.ts instead of the better-auth CLI (+6 more)

### Community 90 - "S3-compatible storage service (initStorage, uploadImage, uploadAudio)"
Cohesion: 0.14
Nodes (14): Object storage deliberately outside the deployment compose, Cloudflare caches 200s and 404s; generated media needs unique keys, forcePathStyle is not optional for self-hosted gateways, PutBucketPolicy re-applied on every boot, not only on CreateBucket, S3-compatible storage service (initStorage, uploadImage, uploadAudio), services/audio-duration.ts — MPEG frame-walking duration parser, Voice notes become stored S3 objects with a URL on the row, On-demand portrait re-render queued and picked up by polling (+6 more)

### Community 91 - "Android APK: 136.5 MB to 42.9 MB"
Cohesion: 0.17
Nodes (13): Never hand-edit apps/canvas/android/, Never import the icon barrel, ABI restricted to arm64-v8a, Android APK: 136.5 MB to 42.9 MB, Per-icon imports instead of the hugeicons barrel, R8 minification and resource shrinking, with-android-build-optimizations config plugin, Trap 4: apps/canvas/android/ is regenerated by every build (+5 more)

### Community 92 - "devDependencies"
Cohesion: 0.15
Nodes (13): devDependencies, babel-preset-expo, @eidolon/tsconfig, lightningcss, postcss, @tailwindcss/postcss, @types/react, babel-preset-expo (+5 more)

### Community 93 - "session.ts"
Cohesion: 0.22
Nodes (9): cards, ownerId(), requireOwner(), bearer(), ensureLocalOwner(), Owner, ownerFor(), sessionOwner() (+1 more)

### Community 94 - "Local AI stack (LLM, TTS, image)"
Cohesion: 0.17
Nodes (13): ComfyUI with RealVisXL V5.0 Lightning, CUDA runtime is a separate download, Kokoro-FastAPI voice server, llama.cpp server with L3-8B-Stheno, Local AI stack (LLM, TTS, image), Port 5000 is reserved by Hyper-V, PuLID face identity nodes, llama-server --embeddings --pooling mean (+5 more)

### Community 95 - "protocol/package.json"
Cohesion: 0.15
Nodes (12): dependencies, zod, exports, main, name, private, scripts, test (+4 more)

### Community 96 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, esModuleInterop, isolatedModules, module, moduleResolution, noImplicitAny, resolveJsonModule, skipLibCheck (+4 more)

### Community 97 - "call/[id].tsx"
Cohesion: 0.26
Nodes (9): CallControls(), CallSubtitles(), CallSubtitlesProps, CallTopBar(), CallTopBarProps, CALL_COPY, CALL_MS, callDurationLabel() (+1 more)

### Community 98 - "google-fonts.ts"
Cohesion: 0.30
Nodes (10): cacheUri(), fetchFontCatalogue(), FontCatalogueError, getApiKey(), GoogleFontsError, hasGoogleFontsApiKey(), normalise(), readDiskCache() (+2 more)

### Community 99 - "§18 Motion is designed, gated, and measured"
Cohesion: 0.18
Nodes (12): Reduced motion means gentler, not absent, hover: is unconditional on native react-native-css, Generated reply suggestions with normalizeSuggestions, hitSlop larger than the gap hands taps to the last-rendered sibling, Suggestions move behind the lightning button, splitTrailingWord: one animated node per effect, not per token, shapeSuggestion and capActions limit actions in the reply tray, Three stacked causes of a dead pinch gesture (+4 more)

### Community 100 - "metro.config.js"
Cohesion: 0.20
Nodes (10): config, dequeue(), fs, { getDefaultConfig }, os, path, readQueue, throttledRead() (+2 more)

### Community 101 - "comfy-workflow.ts"
Cohesion: 0.22
Nodes (9): buildImageWorkflow(), dimensionsFor(), Graph, Node, Orientation, WorkflowRequest, Selfie, SelfieRequest (+1 more)

### Community 102 - "conductor/tsconfig.json"
Cohesion: 0.18
Nodes (10): compilerOptions, paths, rootDir, types, extends, include, bun, src/**/* (+2 more)

### Community 103 - "CHANGELOG — release notes parsed by scripts/release.ts"
Cohesion: 0.20
Nodes (11): Release v1.0.1, lockToCharacter opens the theme studio in character scope, Google Fonts browser with lazy cached previews, Insight mode (trust score, tier, affinity pill), Lorebook and long-term memory chapters, CHANGELOG — release notes parsed by scripts/release.ts, Theme Studio and Theme & Font Lab, Web search provider chain: DuckDuckGo, serper.dev, exa.ai (+3 more)

### Community 104 - "packages/config/src/copy.ts shared vocabulary"
Cohesion: 0.18
Nodes (11): Dragonfly prompt cache layer, Prompt catalogue in @eidolon/config, One-hour in-memory result cache, packages/config/src/copy.ts shared vocabulary, humanPairingError known-message passthrough, Copy needs no pronoun at all, STATUS_COPY single status table, @eidolon/config single source of configuration (+3 more)

### Community 105 - "Character card fields reaching the prompt"
Cohesion: 0.18
Nodes (11): READER_LABEL colon-only match, CHAT_TURN.readerTurnStops, stripSpeakerLabel, Transcript-shaped examples teach the label, A blank card falls back to the assistant voice, Character card fields reaching the prompt, Example dialogue as the voice lever, Rules kept apart from personality (+3 more)

### Community 106 - "config/package.json"
Cohesion: 0.18
Nodes (10): exports, ./server, main, name, private, scripts, test, typecheck (+2 more)

### Community 107 - "stack.ts"
Cohesion: 0.31
Nodes (9): isHealthy(), launch(), report(), Service, SERVICES, START, status(), up() (+1 more)

### Community 108 - "ninja 'manifest build.ninja still dirty' 260-char path failure"
Cohesion: 0.22
Nodes (10): CMake staging relocated to .native-build/, ninja 'manifest build.ninja still dirty' 260-char path failure, Bun's isolated store breaks a partial node_modules copy, Two-stage Bun Dockerfile built from the repo root, Containerise the conductor and deploy it on Coolify, Coolify docker_compose_domains takes an array, not the stored map, Dropping LanceDB's embedding stack (onnxruntime, transformers), expo-av rejected in favour of expo-audio (+2 more)

### Community 109 - "Trap 2: react-native-css caches computed styles per rule-set hash"
Cohesion: 0.20
Nodes (10): Viewport spike: media queries reflow without reload on web, Google serves CJK Noto faces as .otf, not .ttf, previewKey remount workaround for the style cache, Theme Studio responsiveness and late-applying edits, Publish theme variables through VariableContextProvider, Trap 6: font derivation can name an unregistered face, Trap 2: react-native-css caches computed styles per rule-set hash, Trap 1: vars() is deprecated in react-native-css 3.0.7 (+2 more)

### Community 110 - "services/stage-directions.ts — one cap enforced everywhere"
Cohesion: 0.20
Nodes (10): Scene fields cut to eight words; a clause-shaped others is dropped, createActionGate buffers asterisks during streaming, Actions stop eating the reply, Enforce in code rather than ask politely in a prompt, services/stage-directions.ts — one cap enforced everywhere, The client ignores text_replace, so corrections must happen before emit, Square-bracket stage directions converted to asterisk form after the fact, Chronicle summariser with a response_format JSON schema (+2 more)

### Community 111 - "tsconfig.json"
Cohesion: 0.20
Nodes (9): ./packages/tsconfig/base.json, scripts/**/*.ts, compilerOptions, noEmit, types, extends, include, bun (+1 more)

### Community 112 - "apk.ts"
Cohesion: 0.20
Nodes (7): BUILT, CANVAS, OUT_DIR, ROOT, skipBuild, source, target

### Community 113 - "AqueousPool.tsx"
Cohesion: 0.25
Nodes (8): AqueousPool(), AqueousPoolProps, EASE_OUT, FIELD_PX, Ring(), RingProps, RINGS, ringWeight()

### Community 114 - "photo-caption.ts"
Cohesion: 0.39
Nodes (7): captionLine(), CaptionRequest, firstCaption(), NOT_A_CAPTION, shorten(), usableCaption(), askInVoice()

### Community 115 - "Four tiers of memory"
Cohesion: 0.22
Nodes (9): Tier 2 chronicle summaries, Recall stays quiet rather than guessing, Tier 4 lorebook with affinity gating, Tier 3 semantic recall via LanceDB, Four tiers of memory, prompt-builder.ts seven-source assembly, Tier 1 working history, Cosine similarity replaces reciprocal L2 (+1 more)

### Community 116 - "tokens/package.json"
Cohesion: 0.22
Nodes (8): exports, main, name, private, scripts, typecheck, types, version

### Community 117 - "stack-nav.test.ts"
Cohesion: 0.36
Nodes (4): matches(), openMode, StackRoute, roster

### Community 118 - "with-android-build-optimizations.js"
Cohesion: 0.25
Nodes (4): fs, GRADLE_PROPERTIES, path, {
  withDangerousMod,
  withGradleProperties,
  withSettingsGradle,
}

### Community 120 - "chronicle-writer.ts"
Cohesion: 0.39
Nodes (7): buildChronicleMessages(), CHRONICLE_SCHEMA, ChronicleResponse, structuredBullets(), summarizeMessages(), tidy(), toBullets()

### Community 121 - "fontScale publishes explicit --text-* pixel values rather than scaling rem"
Cohesion: 0.25
Nodes (8): rem is 14 on native and 16 in the DOM — name the breakpoint, never the pixel, fontScale publishes explicit --text-* pixel values rather than scaling rem, expo-file-system fallback storage: exports map and textSync(), Chat surface theme audit: named type steps and theme.radius, A try/catch around a require turns resolution failure into a silent capability downgrade, Trap 15: arbitrary Tailwind sizes bypass fontScale, Trap 16: MMKV namespaces its web keys, Trap 27: the storage fallback used to persist nothing on a device

### Community 122 - "character.ts"
Cohesion: 0.25
Nodes (7): EidolonMetadata, EidolonMetadataSchema, TavernV2Card, TavernV2CardSchema, TavernV2CharacterData, TavernV2CharacterDataSchema, TavernV2Metadata

### Community 123 - "android"
Cohesion: 0.29
Nodes (7): backgroundColor, foregroundImage, adaptiveIcon, backgroundColor, package, versionCode, android

### Community 124 - "plugins"
Cohesion: 0.29
Nodes (7): plugins, expo-asset, expo-speech-recognition, expo-asset, expo-speech-recognition, ./plugins/with-android-build-optimizations, ./plugins/with-dark-system-chrome

### Community 125 - "card-api.ts"
Cohesion: 0.33
Nodes (6): CardPick, fileField(), ImportBody, ImportedCharacter, ImportResult, importTavernCard()

### Community 126 - "devDependencies"
Cohesion: 0.29
Nodes (7): @biomejs/biome, devDependencies, @biomejs/biome, turbo, @types/bun, typescript, turbo

### Community 127 - "GET /api/v1/characters/:id/gallery merging three image sources"
Cohesion: 0.29
Nodes (7): The saved avatar crop travels with the character everywhere, Gallery picture actions and Find it in the chat, Back reaches the roster, the pager stops eating pinches, and the fields move off the edge, openMode in lib/stack-nav.ts decides push vs replace vs dismissTo, A profile page, and everywhere the pictures went, GET /api/v1/characters/:id/gallery merging three image sources, Merge in SQL so LIMIT and OFFSET apply to the sorted result

### Community 128 - "completeText raw completions endpoint"
Cohesion: 0.29
Nodes (7): ENHANCE.actionChance on statements only, A clean failure beats a confident wrong answer, completeText raw completions endpoint, enhance_message rework flow, enhanceHistory undo stack, Temperature 0.2 makes a rewrite a rewrite, Prompt tuning on an 8B is not monotonic

### Community 129 - "check-file-size.ts"
Cohesion: 0.29
Nodes (6): failures, KNOWN_DEBT, Offender, offenders, SEARCH_ROOTS, SHOW_ALL

### Community 130 - "Eidolon Agent Guidelines & Monorepo Rules"
Cohesion: 0.33
Nodes (6): Eidolon Agent Guidelines & Monorepo Rules, Resilient LLM Parsing (jsonrepair), Parse LLM output only when it contains a real bracketed array, Trap 14: jsonrepair turns prose into an array, Eidolon Monorepo Coding Standards & Architecture Rules, safeJsonParse mandatory JSON parsing protocol

### Community 132 - "voice-api.ts"
Cohesion: 0.47
Nodes (5): fetchVoicePreview(), fetchVoices(), VoiceCatalogue, voicePreviewUrl(), voicesUrl()

### Community 133 - "PAIRING_SECRET — the only gate on the WebSocket"
Cohesion: 0.40
Nodes (6): PAIRING_SECRET has no default; validateToken refuses every token when blank, Trap 26: Android blocks cleartext HTTP in a release build, Trap 9: EXPO_PUBLIC_* is inlined into the bundle, EXPO_PUBLIC_* values are inlined into the bundle, PAIRING_SECRET — the only gate on the WebSocket, §9 Secrets: EXPO_PUBLIC_* and PAIRING_SECRET

### Community 134 - "png-chunks.d.ts"
Cohesion: 0.40
Nodes (4): png-chunk-text, png-chunks-encode, png-chunks-extract, PngChunk

### Community 135 - "§11 Report honestly"
Cohesion: 0.50
Nodes (4): Verify before reporting, A silent no-op edit after Biome reformatting, caught only by typecheck, lastError is set in four places and rendered in none, §11 Report honestly

### Community 138 - "Desktop Phase 0: make the web target real again"
Cohesion: 0.50
Nodes (4): Desktop Phase 0: make the web target real again, lightningcss pin aligned down to the unexplained root pin, react-native-web 0.19.13 to 0.21.2 peer alignment, One codebase through react-native-web inside a Tauri v2 shell

### Community 139 - "Trap 24: audio_chunk arrives before the assistant message is committed"
Cohesion: 0.50
Nodes (4): clearAutoPlay: the token is consumed by the play that uses it, status_update idle with detail check commits the turn, Trap 24: audio_chunk arrives before the assistant message is committed, Trap 10: no turn_complete event; a turn ends on status_update idle

### Community 140 - "initStorage persistence fallback"
Cohesion: 0.50
Nodes (4): Android cleartext HTTP blocked since API 28, initStorage persistence fallback, services/haptics.ts lazy require, expo-build-properties writes cleartext traffic

### Community 141 - "PaintingCard calm placeholder loader"
Cohesion: 0.50
Nodes (4): PaintingCard calm placeholder loader, ComfyUI binary preview frames, A dropped socket must end the turn, Loading skeletons shaped like their screens

### Community 142 - "Gestures do not cross a Modal boundary"
Cohesion: 0.50
Nodes (4): Gestures do not cross a Modal boundary, Gallery pinch, pan and double-tap zoom, Android will not clip a transformed child, Avatar crop as a region of the photo

### Community 143 - "§10 Every change set is recorded"
Cohesion: 0.67
Nodes (3): Record every change set, §10 Every change set is recorded, §16 No comments

### Community 145 - "Trap 12: FlashList v2 removed estimatedItemSize"
Cohesion: 0.67
Nodes (3): maintainVisibleContentPosition replaces estimatedItemSize, Trap 12: FlashList v2 removed estimatedItemSize, Trap 28: a player inside a FlashList cell dies on recycle

### Community 146 - "Angle-bracket nudge syntax"
Cohesion: 0.67
Nodes (3): Angle-bracket nudge syntax, Influence directives, one-way steering, splitInfluence deterministic nudge removal

### Community 147 - "feed-scroll.ts trackLiveEdge"
Cohesion: 0.67
Nodes (3): Live-edge scroll following, drawDistancePx raised to 1400, feed-scroll.ts trackLiveEdge

### Community 148 - "Mind and Lorebook drawer"
Cohesion: 0.67
Nodes (3): characters.affinity_locked author override, WCAG 2.2 dragging-alternative slider, Mind and Lorebook drawer

### Community 149 - "Trap 19: platform_machine == 'x86_64' never matches on Windows"
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
- **812 isolated node(s):** `AvatarFallbackProps`, `AvatarImageProps`, `AvatarProps`, `ColorPickerModalProps`, `ThemeScope` (+807 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1022 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **58 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

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
- **Why does `dependencies` connect `dependencies` to `clsx`, `@eidolon/config`, `@eidolon/protocol`, `@eidolon/tokens`, `expo`, `expo-audio`, `expo-document-picker`, `expo-haptics`, `expo-linear-gradient`, `expo-linking`, `expo-media-library`, `expo-status-bar`, `@hugeicons/react-native`, `nativewind`, `react`, `react-dom`, `react-native`, `react-native-reanimated`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, `react-native-worklets`, `@rn-primitives/dialog`, `@rn-primitives/dropdown-menu`, `@rn-primitives/slot`, `@rn-primitives/types`, `@shopify/flash-list`, `tailwind-merge`, `tailwindcss`, `scripts`, `plugins`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._