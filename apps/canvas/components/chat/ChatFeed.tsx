import { CHAT } from "@eidolon/config";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import * as React from "react";
import { type NativeScrollEvent, type NativeSyntheticEvent, Text, View } from "react-native";
import type { ChatMessage } from "@/store/chat-messages";
import { JumpToLatest } from "./JumpToLatest";
import { MessageCard } from "./MessageCard";
import { StreamingMessageCard } from "./StreamingMessageCard";

const STATUS_COPY: Record<string, string> = {
  thinking: "Composing a reply",
  searching: "Checking the world",
  painting: "Painting a scene",
  speaking: "Finding her voice",
};

export interface ChatFeedProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  activeStatus: string;
  statusDetail: string | null;
  characterId: string;
  characterName: string;
  isSynthesizingAudio?: boolean;
}

function keyExtractor(item: ChatMessage): string {
  return item.id;
}

function getItemType(item: ChatMessage): string {
  return item.audioUrl ? "voice" : item.role;
}

function EmptyStage({ characterName }: { characterName: string }) {
  return (
    <View className="items-center rounded-card border border-border border-dashed bg-card px-5 py-8">
      <Text className="font-ui-bold text-xs text-text-muted uppercase tracking-[2px]">
        The stage is set
      </Text>
      <Text className="mt-2 text-center font-main text-sm text-text-muted leading-normal">
        Open the scene with {characterName}. Wrap stage directions in *asterisks* and they render as
        narration.
      </Text>
    </View>
  );
}

export function ChatFeed({
  messages,
  isStreaming,
  streamingText,
  activeStatus,
  statusDetail,
  characterId,
  characterName,
  isSynthesizingAudio = false,
}: ChatFeedProps) {
  const listRef = React.useRef<FlashListRef<ChatMessage>>(null);
  const liveEdgeRef = React.useRef(true);
  const [isAtLiveEdge, setIsAtLiveEdge] = React.useState(true);

  const followTail = React.useCallback((animated: boolean) => {
    listRef.current?.scrollToEnd({ animated });
  }, []);

  // The one hook that fires whenever the content actually grows: a new message,
  // and every token of a reply as it is written. Following here means the tail
  // stays on screen while it streams instead of jumping once at the end.
  // Gated on the live edge, so a reader who scrolled up is never yanked back —
  // not when they send, and not while the reply is being written.
  const handleContentSizeChange = React.useCallback(() => {
    if (!liveEdgeRef.current) return;
    followTail(false);
  }, [followTail]);

  const handleScroll = React.useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distance = contentSize.height - layoutMeasurement.height - contentOffset.y;
    const next = distance <= CHAT.liveEdgeThresholdPx;
    if (next === liveEdgeRef.current) return;
    liveEdgeRef.current = next;
    setIsAtLiveEdge(next);
  }, []);

  const jumpToLatest = React.useCallback(() => {
    liveEdgeRef.current = true;
    setIsAtLiveEdge(true);
    followTail(true);
  }, [followTail]);

  const renderItem = React.useCallback(
    ({ item }: { item: ChatMessage }) => <MessageCard message={item} />,
    [],
  );

  const footer = React.useMemo(() => {
    if (!isStreaming) return null;
    return (
      <StreamingMessageCard
        text={streamingText}
        status={statusDetail ?? STATUS_COPY[activeStatus] ?? null}
        characterId={characterId}
        isSynthesizingAudio={isSynthesizingAudio}
      />
    );
  }, [isStreaming, streamingText, statusDetail, activeStatus, characterId, isSynthesizingAudio]);

  const empty = React.useMemo(
    () => (isStreaming ? null : <EmptyStage characterName={characterName} />),
    [isStreaming, characterName],
  );

  return (
    <View className="flex-1">
      <FlashList
        ref={listRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemType={getItemType}
        drawDistance={CHAT.drawDistancePx}
        ListFooterComponent={footer}
        ListEmptyComponent={empty}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        maintainVisibleContentPosition={{
          autoscrollToBottomThreshold: 0,
          startRenderingFromBottom: true,
        }}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={false}
      />

      {isAtLiveEdge || messages.length === 0 ? null : (
        <JumpToLatest isStreaming={isStreaming} characterId={characterId} onPress={jumpToLatest} />
      )}
    </View>
  );
}
