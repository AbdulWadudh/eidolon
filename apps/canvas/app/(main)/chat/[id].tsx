import { CONNECTION_COPY, MIND_COPY, STATUS_COPY } from "@eidolon/config";
import { capitalize, isString } from "es-toolkit";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import type { TextInput } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionsSheet, type ChatAction } from "@/components/chat/ActionsSheet";
import { ChatBackdrop } from "@/components/chat/ChatBackdrop";
import { ChatFeed } from "@/components/chat/ChatFeed";
import { ChatSheets } from "@/components/chat/ChatSheets";
import { ChatTopBar } from "@/components/chat/ChatTopBar";
import { InputDock } from "@/components/chat/InputDock";
import { PhotoRequestSheet } from "@/components/chat/PhotoRequestSheet";
import { type PhotoAction, PhotoViewer } from "@/components/chat/PhotoViewer";
import { SuggestionTray } from "@/components/chat/SuggestionTray";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { useChatView } from "@/hooks/use-chat-view";
import { usePhotoFlow } from "@/hooks/use-photo-flow";
import { useSuggestions } from "@/hooks/use-suggestions";
import { VoiceNotesProvider } from "@/hooks/use-voice-notes";
import { useAffinityStore } from "@/store/affinity-store";
import { forgetCharacter, loadHistory } from "@/store/chat-history";
import { useChatStore } from "@/store/chat-store";
import { useConnectionStore } from "@/store/connection";
import { fetchMind } from "@/store/mind-api";
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
  const characterName = capitalize(characterId);
  const theme = useResolvedTheme(characterId);
  const inputRef = React.useRef<TextInput>(null);

  const socket = useChatSocket(characterId);
  const chat = useChatStore();
  const view = useChatView(characterId);
  const serverHost = useConnectionStore((state) => state.serverHost);
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const [mindOpen, setMindOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [themeOpen, setThemeOpen] = React.useState(false);
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

  useFocusEffect(
    React.useCallback(() => {
      loadHistory(serverHost, characterId);
      void fetchMind(serverHost, characterId);
      return () => {
        resetAffinity();
      };
    }, [serverHost, characterId, resetAffinity]),
  );

  // The socket already carries mind_update into the chat store. Mirroring it
  // here is what raises the toast and the haptic, and only in Insight Mode.
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

  const handleAction = React.useCallback(
    (action: ChatAction) => {
      setActionsOpen(false);
      if (action === "refresh") loadHistory(serverHost, characterId);
      if (action === "reset") forgetCharacter(serverHost, characterId);
      if (action === "replies") chat.setSuggestionsHidden(!chat.areSuggestionsHidden);
      if (action === "lorebook") setMindOpen(true);
    },
    [chat.setSuggestionsHidden, chat.areSuggestionsHidden, serverHost, characterId],
  );

  return (
    <SafeAreaView
      edges={["top", "bottom"]}
      style={{ flex: 1, backgroundColor: theme.canvas }}
      className="flex-1 bg-canvas"
    >
      <ChatTopBar
        characterName={characterName}
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
        <ChatBackdrop uri={view.characterLook.backgroundUrl} characterId={characterId} />

        <VoiceNotesProvider autoPlay={autoPlay} onAutoPlayed={chat.clearAutoPlay}>
          <ChatFeed
            messages={view.messages}
            isStreaming={view.isStreaming}
            streamingText={view.streamingText}
            activeStatus={view.activeStatus}
            statusDetail={view.statusDetail}
            characterId={characterId}
            characterName={characterName}
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
            onAction={(action) => {
              if (action === "more") setActionsOpen(true);
              if (action === "lorebook") setMindOpen(true);
              if (action === "enhance") chat.enhanceInput(characterId);
              if (action === "revert") chat.revertEnhance();
              if (action === "suggestions") replies.toggle();
              if (action === "gallery") photos.openSheet();
            }}
          />
        </VoiceNotesProvider>
      </KeyboardAvoidingView>

      <PhotoRequestSheet
        isOpen={photos.isSheetOpen}
        characterId={characterId}
        characterName={characterName}
        ideas={view.photoIdeas}
        areIdeasLoading={view.areIdeasLoading}
        onRequestIdeas={() => chat.requestPhotoIdeas(characterId)}
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
        characterName={characterName}
        avatarUrl={view.characterLook.avatarUrl}
        avatarCrop={view.characterLook.avatarCrop}
        serverHost={serverHost}
        settingsOpen={settingsOpen}
        themeOpen={themeOpen}
        mindOpen={mindOpen}
        onCloseSettings={() => setSettingsOpen(false)}
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
        repliesHidden={chat.areSuggestionsHidden}
        onClose={() => setActionsOpen(false)}
        onAction={handleAction}
      />
    </SafeAreaView>
  );
}
