import { CONNECTION_COPY, MIND_COPY, STATUS_COPY } from "@eidolon/config";
import { capitalize, isString } from "es-toolkit";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import type { TextInput } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionsSheet, type ChatAction } from "@/components/chat/ActionsSheet";
import { ChatBackdrop } from "@/components/chat/ChatBackdrop";
import { ChatFeed } from "@/components/chat/ChatFeed";
import { ChatTopBar } from "@/components/chat/ChatTopBar";
import { InputDock } from "@/components/chat/InputDock";
import { MindDrawer } from "@/components/chat/MindDrawer";
import { PhotoRequestSheet } from "@/components/chat/PhotoRequestSheet";
import { type PhotoAction, PhotoViewer } from "@/components/chat/PhotoViewer";
import { SuggestionTray } from "@/components/chat/SuggestionTray";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { usePhotoFlow } from "@/hooks/use-photo-flow";
import { VoiceNotesProvider } from "@/hooks/use-voice-notes";
import { useAffinityStore } from "@/store/affinity-store";
import { forgetCharacter, loadHistory } from "@/store/chat-history";
import { isSuggestionTrayVisible } from "@/store/chat-selectors";
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
  const serverHost = useConnectionStore((state) => state.serverHost);
  const [actionsOpen, setActionsOpen] = React.useState(false);
  const [mindOpen, setMindOpen] = React.useState(false);
  const applyMindUpdate = useAffinityStore((state) => state.applyMindUpdate);
  const resetAffinity = useAffinityStore((state) => state.reset);
  const photos = usePhotoFlow(characterId, serverHost);
  const trayVisible = isSuggestionTrayVisible(chat);

  React.useEffect(() => {
    setActiveCharacter(characterId);
    return () => {
      setActiveCharacter(null);
    };
  }, [characterId, setActiveCharacter]);

  React.useEffect(() => {
    loadHistory(serverHost, characterId);
    void fetchMind(serverHost, characterId);
    return () => {
      resetAffinity();
    };
  }, [serverHost, characterId, resetAffinity]);

  // The socket already carries mind_update into the chat store. Mirroring it
  // here is what raises the toast and the haptic, and only in Insight Mode.
  React.useEffect(() => {
    const mind = chat.mind;
    if (!mind) return;
    applyMindUpdate(mind.affinityDelta, mind.affinity, mind.tier, mind.mood);
  }, [chat.mind, applyMindUpdate]);

  const statusColor = socket.isConnected
    ? chat.activeStatus === "idle"
      ? theme.success
      : theme.primary
    : theme.textMuted;

  const isBusy = chat.activeStatus !== "idle";

  const statusLabel = socket.isConnected
    ? isBusy
      ? (STATUS_LABEL[chat.activeStatus] ?? MIND_COPY.organicStatus)
      : `${MIND_COPY.organicStatus} • ${chat.mind?.mood ?? "Here"}`
    : CONNECTION_COPY[socket.status];

  const autoPlay = React.useMemo(() => {
    const target = chat.messages.find((entry) => entry.id === chat.autoPlayMessageId);
    return target?.audioUrl ? { id: target.id, url: target.audioUrl } : null;
  }, [chat.autoPlayMessageId, chat.messages]);

  const handleSend = React.useCallback(() => {
    chat.sendUserMessage(chat.inputText, characterId);
  }, [chat.sendUserMessage, chat.inputText, characterId]);

  const handleEditSuggestion = React.useCallback(
    (text: string) => {
      chat.selectSuggestion(text);
      inputRef.current?.focus();
    },
    [chat.selectSuggestion],
  );

  const handleSendSuggestion = React.useCallback(
    (text: string) => {
      chat.sendUserMessage(text, characterId);
    },
    [chat.sendUserMessage, characterId],
  );

  const handleReroll = React.useCallback(() => {
    chat.rerollSuggestions(characterId);
  }, [chat.rerollSuggestions, characterId]);

  const handleHideSuggestions = React.useCallback(() => {
    chat.dismissSuggestions();
  }, [chat.dismissSuggestions]);

  const toggleSuggestions = React.useCallback(() => {
    if (chat.isTrayOpen) {
      chat.dismissSuggestions();
      return;
    }
    chat.revealSuggestions();
    if (chat.suggestions.length === 0 && !chat.isSuggestionsLoading) {
      chat.rerollSuggestions(characterId);
    }
  }, [
    chat.isTrayOpen,
    chat.dismissSuggestions,
    chat.revealSuggestions,
    chat.rerollSuggestions,
    chat.suggestions.length,
    chat.isSuggestionsLoading,
    characterId,
  ]);

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
        avatarUrl={chat.characterLook.avatarUrl}
        avatarCrop={chat.characterLook.avatarCrop}
        onAvatarPress={() => photos.viewAvatar(chat.characterLook.avatarUrl)}
        characterId={characterId}
        statusLabel={statusLabel}
        statusColor={statusColor}
        isBusy={isBusy}
        mind={chat.mind}
        onBack={() => router.back()}
        onCall={() => router.push(`/chat/${characterId}`)}
        onOverflow={() => router.push("/demo")}
      />

      {/* Behind everything below the top bar — the messages and the dock — but
          not behind the bar itself, which carries the name, mood and affinity
          and has to stay readable whatever picture was chosen. */}
      <KeyboardAvoidingView behavior="padding" automaticOffset style={{ flex: 1 }}>
        <ChatBackdrop uri={chat.characterLook.backgroundUrl} characterId={characterId} />

        <VoiceNotesProvider autoPlay={autoPlay} onAutoPlayed={chat.clearAutoPlay}>
          <ChatFeed
            messages={chat.messages}
            isStreaming={chat.isStreaming}
            streamingText={chat.streamingText}
            activeStatus={chat.activeStatus}
            statusDetail={chat.statusDetail}
            characterId={characterId}
            characterName={characterName}
            isSynthesizingAudio={chat.isSynthesizingAudio}
            isPainting={chat.isPainting}
            paintingStep={chat.paintingStep}
            paintingTotal={chat.paintingTotal}
            onOpenPhoto={photos.view}
          />

          {trayVisible ? (
            <SuggestionTray
              suggestions={chat.suggestions}
              isLoading={chat.isSuggestionsLoading}
              characterId={characterId}
              onSend={handleSendSuggestion}
              onEdit={handleEditSuggestion}
              onReroll={handleReroll}
              onHide={handleHideSuggestions}
            />
          ) : null}

          <InputDock
            value={chat.inputText}
            isStreaming={chat.isStreaming}
            isEnhancing={chat.isEnhancing}
            revertSteps={chat.enhanceHistory.length}
            characterId={characterId}
            inputRef={inputRef}
            onChangeText={chat.setInputText}
            onSend={handleSend}
            onInterrupt={() => chat.interrupt(characterId)}
            suggestionsOpen={trayVisible}
            onAction={(action) => {
              if (action === "more") setActionsOpen(true);
              if (action === "lorebook") setMindOpen(true);
              if (action === "enhance") chat.enhanceInput(characterId);
              if (action === "revert") chat.revertEnhance();
              if (action === "suggestions") toggleSuggestions();
              if (action === "gallery") photos.openSheet();
            }}
          />
        </VoiceNotesProvider>
      </KeyboardAvoidingView>

      <PhotoRequestSheet
        isOpen={photos.isSheetOpen}
        characterId={characterId}
        characterName={characterName}
        ideas={chat.photoIdeas}
        areIdeasLoading={chat.areIdeasLoading}
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

      <MindDrawer
        isOpen={mindOpen}
        characterId={characterId}
        serverHost={serverHost}
        onClose={() => setMindOpen(false)}
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
