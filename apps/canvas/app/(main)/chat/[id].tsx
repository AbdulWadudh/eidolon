import { capitalize, isString } from "es-toolkit";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { type TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { ActionsSheet, type ChatAction } from "@/components/chat/ActionsSheet";
import { ChatFeed } from "@/components/chat/ChatFeed";
import { ChatTopBar } from "@/components/chat/ChatTopBar";
import { InputDock } from "@/components/chat/InputDock";
import { PhotoRequestSheet } from "@/components/chat/PhotoRequestSheet";
import { type PhotoAction, PhotoViewer } from "@/components/chat/PhotoViewer";
import { SuggestionTray } from "@/components/chat/SuggestionTray";
import { useChatSocket } from "@/hooks/use-chat-socket";
import { usePhotoFlow } from "@/hooks/use-photo-flow";
import { VoiceNotesProvider } from "@/hooks/use-voice-notes";
import { forgetCharacter, loadHistory } from "@/store/chat-history";
import { isSuggestionTrayVisible } from "@/store/chat-selectors";
import { useChatStore } from "@/store/chat-store";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme, useThemeStore } from "@/store/theme-store";

const AVATAR_ACTIONS: PhotoAction[] = ["adjust", "save"];

const CONNECTION_LABEL = {
  connected: "Active now",
  connecting: "Connecting…",
  reconnecting: "Reconnecting…",
  disconnected: "Offline",
} as const;

const STATUS_LABEL: Record<string, string> = {
  thinking: "Composing",
  searching: "Searching",
  painting: "Painting",
  speaking: "Speaking",
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
  }, [serverHost, characterId]);

  const statusColor = socket.isConnected
    ? chat.activeStatus === "idle"
      ? theme.success
      : theme.primary
    : theme.textMuted;

  const statusLabel = socket.isConnected
    ? `${CONNECTION_LABEL.connected} • ${STATUS_LABEL[chat.activeStatus] ?? chat.mind?.mood ?? "Ready"}`
    : CONNECTION_LABEL[socket.status];

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
        mind={chat.mind}
        onBack={() => router.back()}
        onCall={() => router.push(`/chat/${characterId}`)}
        onOverflow={() => router.push("/demo")}
      />

      <KeyboardAvoidingView behavior="padding" automaticOffset style={{ flex: 1 }}>
        <VoiceNotesProvider autoPlay={autoPlay} onAutoPlayed={chat.clearAutoPlay}>
          <View className="flex-1">
            {chat.characterLook.backgroundUrl ? (
              <Image
                source={{ uri: chat.characterLook.backgroundUrl }}
                contentFit="cover"
                cachePolicy="disk"
                pointerEvents="none"
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              />
            ) : null}

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
              paintingPreview={chat.paintingPreview}
              onOpenPhoto={photos.view}
            />
          </View>

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
            characterId={characterId}
            inputRef={inputRef}
            onChangeText={chat.setInputText}
            onSend={handleSend}
            onInterrupt={() => chat.interrupt(characterId)}
            suggestionsOpen={trayVisible}
            onAction={(action) => {
              if (action === "more") setActionsOpen(true);
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
