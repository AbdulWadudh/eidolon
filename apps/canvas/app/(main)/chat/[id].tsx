import {
  CONFIRM_COPY,
  CONNECTION_COPY,
  GALLERY_COPY,
  MIND_COPY,
  STATUS_COPY,
} from "@eidolon/config";
import { isString } from "es-toolkit";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import type { TextInput } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionsSheet, type ChatAction } from "@/components/chat/ActionsSheet";
import { AdminSheet } from "@/components/chat/AdminSheet";
import { ChatBackdrop } from "@/components/chat/ChatBackdrop";
import { ChatFeed } from "@/components/chat/ChatFeed";
import { ChatSheets } from "@/components/chat/ChatSheets";
import { ChatTopBar } from "@/components/chat/ChatTopBar";
import { InputDock } from "@/components/chat/InputDock";
import { MomentSheet } from "@/components/chat/MomentSheet";
import { MoodSheet } from "@/components/chat/MoodSheet";
import { OutfitSheet } from "@/components/chat/OutfitSheet";
import { PhotoRequestSheet } from "@/components/chat/PhotoRequestSheet";
import { type PhotoAction, PhotoViewer } from "@/components/chat/PhotoViewer";
import { StartConversation } from "@/components/chat/StartConversation";
import { SuggestionTray } from "@/components/chat/SuggestionTray";
import { LoadingState } from "@/components/common/loading-state";
import { AlertSheet } from "@/components/ui/alert-sheet";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useChatView } from "@/hooks/use-chat-view";
import { useConfirm } from "@/hooks/use-confirm";
import { usePhotoFlow } from "@/hooks/use-photo-flow";
import { useSuggestions } from "@/hooks/use-suggestions";
import { VoiceNotesProvider } from "@/hooks/use-voice-notes";
import { useAffinityStore } from "@/store/affinity-store";
import { type CharacterCard, fetchCharacter, requestMoment } from "@/store/character-api";
import { startConversation } from "@/store/chat-api";
import { forgetCharacter, loadHistory } from "@/store/chat-history";
import { saveLook } from "@/store/chat-photos";
import { useChatStore } from "@/store/chat-store";
import { useConnectionStore } from "@/store/connection";
import { fetchMind, patchAffinity, summarizeNow } from "@/store/mind-api";
import { useResolvedTheme, useThemeStore } from "@/store/theme-store";

const AVATAR_ACTIONS: PhotoAction[] = ["adjust", "save"];

const STATUS_LABEL: Record<string, string> = {
  thinking: STATUS_COPY.thinking.label,
  searching: STATUS_COPY.searching.label,
  painting: STATUS_COPY.painting.label,
  speaking: STATUS_COPY.speaking.label,
};

export default function ChatScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const setActiveCharacter = useThemeStore((state) => state.setActiveCharacter);

  const characterId = isString(id) ? id : "default";
  const theme = useResolvedTheme(characterId);
  const inputRef = React.useRef<TextInput>(null);

  const socket = useChatSocket(characterId);
  const chat = useChatStore();
  const view = useChatView(characterId);
  const serverHost = useConnectionStore((state) => state.serverHost);
  const [card, setCard] = React.useState<CharacterCard | null>(null);

  const loadCard = React.useCallback(() => {
    if (!serverHost) return;
    void fetchCharacter(serverHost, characterId).then((next) => {
      if (next) setCard(next.card);
    });
  }, [serverHost, characterId]);

  const characterName = card?.name.trim() ?? "";
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const [mindOpen, setMindOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [themeOpen, setThemeOpen] = React.useState(false);
  const [moodOpen, setMoodOpen] = React.useState(false);
  const [outfitOpen, setOutfitOpen] = React.useState(false);
  const [momentOpen, setMomentOpen] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [adminOpen, setAdminOpen] = React.useState(false);
  const applyMindUpdate = useAffinityStore((state) => state.applyMindUpdate);
  const resetAffinity = useAffinityStore((state) => state.reset);
  const photos = usePhotoFlow(characterId, serverHost);
  const replies = useSuggestions(characterId, view, inputRef);

  React.useEffect(() => {
    setActiveCharacter(characterId);
    return () => {
      setActiveCharacter(null);
    };
  }, [characterId, setActiveCharacter]);

  // She was someone else's to begin with. The server has handed over a copy of its own,
  // so the conversation carries on there rather than on the character it started from.

  // Browsing her leaves nothing behind; this is the moment a copy is made.

  // The conversation arrives in one piece or not at all. Letting the feed, the name and
  // the dock each appear as they land reads as the screen rearranging itself under you.
  const isReady = card !== null && chat.canReply !== null && !view.isLoadingHistory;

  const [isStarting, setStarting] = React.useState(false);
  const beginConversation = React.useCallback(() => {
    setStarting(true);
    startConversation(serverHost, characterId)
      .then((mine) => {
        if (mine !== characterId) router.replace(`/chat/${mine}`);
        else useChatStore.setState({ canReply: true });
      })
      .finally(() => setStarting(false));
  }, [characterId, router, serverHost]);

  const forkedTo = useChatStore((state) => state.forkedTo);
  React.useEffect(() => {
    if (!forkedTo || forkedTo === characterId) return;
    useChatStore.setState({ forkedTo: null });
    router.replace(`/chat/${forkedTo}`);
  }, [forkedTo, characterId, router]);

  useFocusEffect(
    React.useCallback(() => {
      loadHistory(serverHost, characterId);
      void fetchMind(serverHost, characterId);
      loadCard();
      return () => {
        resetAffinity();
      };
    }, [serverHost, characterId, resetAffinity, loadCard]),
  );

  React.useEffect(() => {
    const mind = view.mind;
    if (!mind) return;
    applyMindUpdate(mind.affinityDelta, mind.affinity, mind.tier, mind.mood);
  }, [view.mind, applyMindUpdate]);

  const statusColor = socket.isConnected
    ? view.activeStatus === "idle"
      ? theme.success
      : theme.primary
    : theme.textMuted;

  const isBusy = view.activeStatus !== "idle";

  const statusLabel = socket.isConnected
    ? isBusy
      ? (STATUS_LABEL[view.activeStatus] ?? MIND_COPY.organicStatus)
      : `${MIND_COPY.organicStatus} • ${view.mind?.mood ?? "Here"}`
    : CONNECTION_COPY[socket.status];

  const autoPlay = React.useMemo(() => {
    const target = view.messages.find((entry) => entry.id === view.autoPlayMessageId);
    return target?.audioUrl ? { id: target.id, url: target.audioUrl } : null;
  }, [view.autoPlayMessageId, view.messages]);

  const handleSend = React.useCallback(() => {
    chat.sendUserMessage(view.inputText, characterId);
  }, [chat.sendUserMessage, view.inputText, characterId]);

  const handleMood = React.useCallback(
    (mood: string, hold: boolean) => {
      setMoodOpen(false);
      chat.setMoodOverride({ mood, hold });
      if (hold) void patchAffinity(serverHost, characterId, { mood });
    },
    [chat.setMoodOverride, serverHost, characterId],
  );

  const confirmation = useConfirm(characterId);

  const handleAction = React.useCallback(
    (action: ChatAction) => {
      setActionsOpen(false);
      if (action === "refresh") loadHistory(serverHost, characterId);
      if (action === "outfit") setOutfitOpen(true);
      if (action === "moment") setMomentOpen(true);
      if (action === "reset") {
        confirmation.ask({
          title: CONFIRM_COPY.resetChat,
          body: CONFIRM_COPY.resetChatBody,
          confirmLabel: CONFIRM_COPY.resetChatAction,
          onConfirm: () => forgetCharacter(serverHost, characterId),
        });
      }
      if (action === "admin") setAdminOpen(true);
      if (action === "summarize") {
        void Promise.resolve(summarizeNow(serverHost, characterId)).then((next) => {
          setNotice(next ? MIND_COPY.chapterSummarize : MIND_COPY.chapterSummarizeFailed);
        });
      }
    },
    [serverHost, characterId, confirmation.ask],
  );

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={{ flex: 1, backgroundColor: theme.canvas }}
      className="flex-1 bg-canvas"
    >
      <ChatTopBar
        characterName={isReady ? characterName : ""}
        avatarUrl={view.characterLook.avatarUrl}
        avatarCrop={view.characterLook.avatarCrop}
        onAvatarPress={() => photos.viewAvatar(view.characterLook.avatarUrl)}
        onOpenProfile={() => router.push(`/characters/${characterId}`)}
        characterId={characterId}
        statusLabel={statusLabel}
        statusColor={statusColor}
        isBusy={isBusy}
        mind={view.mind}
        onBack={() => router.back()}
        onOverflow={() => setSettingsOpen(true)}
        onCall={() => router.push(`/call/${characterId}`)}
      />

      {/* Behind everything below the top bar — the messages and the dock — but
          not behind the bar itself, which carries the name, mood and affinity
          and has to stay readable whatever picture was chosen. */}
      <KeyboardAvoidingView behavior="padding" automaticOffset style={{ flex: 1 }}>
        <ChatBackdrop
          uri={view.characterLook.backgroundUrl}
          characterId={characterId}
          arrivedAt={view.arrivedAt}
          onArrivalSeen={chat.clearArrival}
        />

        <VoiceNotesProvider autoPlay={autoPlay} onAutoPlayed={chat.clearAutoPlay}>
          {isReady ? (
            <>
              <ChatFeed
                messages={view.messages}
                serverHost={serverHost}
                isStreaming={view.isStreaming}
                streamingText={view.streamingText}
                activeStatus={view.activeStatus}
                statusDetail={view.statusDetail}
                characterId={characterId}
                characterName={isReady ? characterName : ""}
                isSynthesizingAudio={view.isSynthesizingAudio}
                isPainting={view.isPainting}
                isLoadingHistory={view.isLoadingHistory}
                loadError={view.loadError}
                onRetryLoad={() => loadHistory(serverHost, characterId)}
                paintingStep={view.paintingStep}
                paintingTotal={view.paintingTotal}
                onOpenPhoto={photos.view}
              />

              {replies.isTrayVisible ? (
                <SuggestionTray
                  suggestions={view.suggestions}
                  isLoading={view.isSuggestionsLoading}
                  characterId={characterId}
                  onSend={replies.send}
                  onEdit={replies.edit}
                  onReroll={replies.reroll}
                  onHide={replies.hide}
                />
              ) : null}

              {chat.canReply ? (
                <InputDock
                  value={view.inputText}
                  isStreaming={view.isStreaming}
                  isEnhancing={view.isEnhancing}
                  revertSteps={view.revertSteps}
                  characterId={characterId}
                  inputRef={inputRef}
                  onChangeText={chat.setInputText}
                  onSend={handleSend}
                  onInterrupt={() => chat.interrupt(characterId)}
                  suggestionsOpen={replies.isTrayVisible}
                  moodActive={chat.moodOverride !== null}
                  onAction={(action) => {
                    if (action === "more") setActionsOpen(true);
                    if (action === "lorebook") setMindOpen(true);
                    if (action === "enhance") chat.enhanceInput(characterId);
                    if (action === "revert") chat.revertEnhance();
                    if (action === "suggestions") replies.toggle();
                    if (action === "gallery") photos.openSheet();
                    if (action === "mood") setMoodOpen(true);
                  }}
                />
              ) : (
                <StartConversation
                  characterId={characterId}
                  characterName={characterName}
                  isStarting={isStarting}
                  onStart={beginConversation}
                />
              )}
            </>
          ) : (
            <LoadingState fill characterId={characterId} label={GALLERY_COPY.loadingChat} />
          )}
        </VoiceNotesProvider>
      </KeyboardAvoidingView>

      {confirmation.sheet}

      <AlertSheet
        isOpen={notice !== null}
        characterId={characterId}
        title={notice ?? ""}
        onClose={() => setNotice(null)}
      />

      <AdminSheet
        isOpen={adminOpen}
        characterId={characterId}
        onClose={() => setAdminOpen(false)}
      />

      <MomentSheet
        isOpen={momentOpen}
        characterId={characterId}
        serverHost={serverHost}
        onClose={() => setMomentOpen(false)}
        onSend={(place) => requestMoment(serverHost, characterId, place)}
      />

      <OutfitSheet
        isOpen={outfitOpen}
        characterId={characterId}
        serverHost={serverHost}
        outfit={view.characterLook.outfit}
        onClose={() => setOutfitOpen(false)}
        onApply={(outfit) => {
          void saveLook(serverHost, characterId, { outfit });
          setOutfitOpen(false);
        }}
      />

      <MoodSheet
        isOpen={moodOpen}
        characterId={characterId}
        currentMood={view.mind?.mood ?? ""}
        override={chat.moodOverride}
        onClose={() => setMoodOpen(false)}
        onApply={handleMood}
        onClear={() => {
          chat.setMoodOverride(null);
          setMoodOpen(false);
        }}
      />

      <PhotoRequestSheet
        isOpen={photos.isSheetOpen}
        characterId={characterId}
        serverHost={serverHost}
        characterName={isReady ? characterName : ""}
        ideas={view.photoIdeas}
        areIdeasLoading={view.areIdeasLoading}
        onRequestIdeas={() => chat.requestPhotoIdeas(characterId, Boolean(photos.editing))}
        editing={photos.editing}
        onClose={photos.closeSheet}
        onSubmit={photos.submit}
      />

      <PhotoViewer
        uri={photos.viewing?.imageUrl ?? null}
        characterId={characterId}
        onClose={photos.closeViewer}
        onAction={photos.act}
        onCrop={photos.crop}
      />

      <PhotoViewer
        uri={photos.avatarUri}
        characterId={characterId}
        actions={AVATAR_ACTIONS}
        onClose={photos.closeAvatar}
        onAction={photos.act}
        onCrop={photos.crop}
      />

      <ChatSheets
        characterId={characterId}
        characterName={isReady ? characterName : ""}
        avatarUrl={view.characterLook.avatarUrl}
        avatarCrop={view.characterLook.avatarCrop}
        serverHost={serverHost}
        settingsOpen={settingsOpen}
        themeOpen={themeOpen}
        mindOpen={mindOpen}
        onCloseSettings={() => {
          setSettingsOpen(false);
          loadCard();
        }}
        onOpenTheme={() => {
          setSettingsOpen(false);
          setThemeOpen(true);
        }}
        onForked={(id) => {
          setSettingsOpen(false);
          router.replace(`/chat/${id}`);
        }}
        onCloseTheme={() => setThemeOpen(false)}
        onCloseMind={() => setMindOpen(false)}
      />

      <ActionsSheet
        isOpen={actionsOpen}
        characterId={characterId}
        onClose={() => setActionsOpen(false)}
        onAction={handleAction}
      />
    </SafeAreaView>
  );
}
