import { CHAT } from "@eidolon/config";
import * as React from "react";
import { Pressable, Text, View } from "react-native";
import { AudioNotePill } from "@/components/audio/AudioNotePill";
import { cn } from "@/lib/utils";
import { type ChatMessage, visibleText } from "@/store/chat-messages";
import { MessageImage } from "./MessageImage";
import { RoleplayText } from "./RoleplayText";

export interface MessageCardProps {
  message: ChatMessage;
  onOpenPhoto?: (message: ChatMessage) => void;
}

function MessageCardBase({ message, onOpenPhoto }: MessageCardProps) {
  const isUser = message.role === "user";
  const body = visibleText(message);

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

      <View
        accessibilityRole="text"
        className={cn(
          "w-full rounded-card border border-border bg-card p-3.5",
          isUser ? "border-primary/25" : "",
        )}
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

        {body.length > 0 ? <RoleplayText text={body} /> : null}

        <View className="mt-2.5 flex-row items-center justify-end gap-1.5">
          {isUser ? <View className="h-1 w-1 rounded-full bg-success" /> : null}
          <Text
            className="font-ui text-xs text-text-muted"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {isUser ? `${message.timestamp} • Delivered` : message.timestamp}
          </Text>
        </View>
      </View>
    </View>
  );
}

export const MessageCard = React.memo(MessageCardBase);
