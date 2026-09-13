import { CHAT, CHAT_COPY } from "@eidolon/config";
import * as React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { AudioNotePill } from "@/components/audio/AudioNotePill";
import { MessageActions } from "@/components/chat/MessageActions";
import { ReplyOptionsPicker } from "@/components/chat/ReplyOptionsPicker";
import { AuthorActions, textAuthorActions } from "@/components/common/authored-field";
import { GlassSurface } from "@/components/ui/glass-surface";
import { useTextAuthor } from "@/hooks/use-text-author";
import { cn } from "@/lib/utils";
import { useAdminStore } from "@/store/admin-store";
import { saveMessageEdit } from "@/store/chat-history";
import { type ChatMessage, visibleText } from "@/store/chat-messages";
import { useChatStore } from "@/store/chat-store";
import { useResolvedTheme } from "@/store/theme-store";
import { MessageImage } from "./MessageImage";
import { RoleplayText } from "./RoleplayText";

export interface MessageCardProps {
  message: ChatMessage;
  onOpenPhoto?: (message: ChatMessage) => void;
  isLastReply?: boolean;
  serverHost?: string;
}

function MessageCardBase({
  message,
  onOpenPhoto,
  isLastReply = false,
  serverHost = "",
}: MessageCardProps) {
  const isUser = message.role === "user";
  const body = visibleText(message);
  const theme = useResolvedTheme(message.characterId);
  const regenerateReply = useChatStore((state) => state.regenerateReply);
  const requestReplyOptions = useChatStore((state) => state.requestReplyOptions);
  const clearReplyOptions = useChatStore((state) => state.clearReplyOptions);
  const replyOptions = useChatStore((state) => state.replyOptions);
  const isBusy = useChatStore((state) => state.isRegenerating);
  const editMessage = useChatStore((state) => state.editMessage);
  const refreshAudio = useChatStore((state) => state.refreshAudio);
  const isSpeaking = useChatStore((state) => state.isSynthesizingAudio);

  const canEditAnyMessage = useAdminStore((state) => state.canEditAnyMessage);
  const canSpeakAnyMessage = useAdminStore((state) => state.canSpeakAnyMessage);

  const options = replyOptions?.messageId === message.id ? replyOptions.options : null;
  const author = useTextAuthor(serverHost, "reply", { characterId: message.characterId });

  const canEdit = isLastReply || canEditAnyMessage;
  const canSpeak = isLastReply || canSpeakAnyMessage;
  const showsActions = isLastReply || canEdit || canSpeak;
  const showsOptions = isLastReply && (options !== null || isBusy);
  const fusesActions = !isUser && showsActions && !showsOptions;

  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(body);

  const beginEdit = () => {
    setDraft(body);
    setEditing(true);
  };

  const replaceText = (text: string) => {
    const hadAudio = message.audioUrl !== null;
    editMessage(message.id, text);

    void saveMessageEdit(serverHost, message.characterId, message.id, text).then((saved) => {
      if (saved && hadAudio) refreshAudio(message.id);
    });
  };

  const commitEdit = () => {
    const text = draft.trim();
    setEditing(false);
    if (text.length === 0 || text === body) return;
    replaceText(text);
  };

  const applyOption = (text: string) => {
    clearReplyOptions();
    replaceText(text);
  };

  const editOption = (text: string) => {
    clearReplyOptions();
    setDraft(text);
    setEditing(true);
  };

  return (
    <View className={cn("my-1.5 items-start", isUser ? "ml-10" : "mr-10")}>
      {message.audioUrl ? (
        <AudioNotePill
          id={message.id}
          audioUrl={message.audioUrl}
          audioDuration={message.audioDuration}
          characterId={message.characterId}
          overlap={CHAT.audioTabOverlapPx}
        />
      ) : null}

      <GlassSurface
        accessibilityRole="text"
        tint="card"
        characterId={message.characterId}
        className={cn(
          "w-full rounded-card border border-border p-3.5",
          isUser ? "border-primary/25" : "",
        )}
        style={{
          ...(message.audioUrl ? { borderTopLeftRadius: 0 } : null),
          ...(fusesActions ? { borderBottomLeftRadius: 0 } : null),
        }}
      >
        {message.imageUrl ? (
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel="Open photo"
            onPress={() => onOpenPhoto?.(message)}
          >
            <MessageImage uri={message.imageUrl} characterId={message.characterId} />
          </Pressable>
        ) : null}

        {editing ? (
          <TextInput
            accessibilityLabel={CHAT_COPY.editMessage}
            multiline
            autoFocus
            value={draft}
            onChangeText={setDraft}
            placeholderTextColor={theme.textMuted}
            cursorColor={theme.primary}
            selectionColor={theme.primary}
            className="font-main text-base text-text-primary"
            style={{ minHeight: 44, textAlignVertical: "top", includeFontPadding: false }}
          />
        ) : body.length > 0 ? (
          <RoleplayText text={body} />
        ) : null}

        {editing ? (
          <View className="mt-2.5">
            <AuthorActions
              characterId={message.characterId}
              {...textAuthorActions(author, draft, setDraft)}
            />
          </View>
        ) : null}

        <View className="mt-2.5 flex-row items-center justify-end gap-1.5">
          {isUser ? <View className="h-1 w-1 rounded-full bg-success" /> : null}
          <Text
            className="font-ui text-xs text-text-muted"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {isUser ? `${message.timestamp} • Delivered` : message.timestamp}
          </Text>
        </View>
      </GlassSurface>

      {showsOptions ? (
        <ReplyOptionsPicker
          characterId={message.characterId}
          options={options ?? []}
          isBusy={isBusy}
          isLoading={options === null && isBusy}
          onPick={applyOption}
          onEditOption={editOption}
          onReroll={() => requestReplyOptions(message.characterId)}
          onCancel={clearReplyOptions}
        />
      ) : isUser || !showsActions ? null : (
        <MessageActions
          characterId={message.characterId}
          isEditing={editing}
          isBusy={isLastReply && isBusy}
          canRevise={isLastReply}
          canEdit={canEdit}
          canSpeak={canSpeak}
          hasAudio={message.audioUrl !== null}
          isSpeaking={isLastReply && isSpeaking}
          onRegenerate={() => requestReplyOptions(message.characterId)}
          onAnother={() => regenerateReply(message.characterId)}
          onSpeak={() => refreshAudio(message.id)}
          onEdit={beginEdit}
          onSave={commitEdit}
          onCancel={() => setEditing(false)}
        />
      )}
    </View>
  );
}

export const MessageCard = React.memo(MessageCardBase);
