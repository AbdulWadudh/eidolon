import { CHAT, STATUS_COPY } from "@eidolon/config";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import * as React from "react";
import { type NativeScrollEvent, type NativeSyntheticEvent, Text, View } from "react-native";
import { nextLiveEdge } from "@/lib/feed-scroll";
import type { ChatMessage } from "@/store/chat-messages";
import { JumpToLatest } from "./JumpToLatest";
import { MessageCard } from "./MessageCard";
import { PaintingCard } from "./PaintingCard";
import { StreamingMessageCard } from "./StreamingMessageCard";

const STATUS_LINE: Record<string, string> = {
  thinking: STATUS_COPY.thinking.line,
  searching: STATUS_COPY.searching.line,
  painting: STATUS_COPY.painting.line,
  speaking: STATUS_COPY.speaking.line,
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
  isPainting?: boolean;
  paintingStep?: number;
  paintingTotal?: number;
  onOpenPhoto?: (message: ChatMessage) => void;
}

function keyExtractor(item: ChatMessage): string {
  return item.id;
}

function getItemType(item: ChatMessage): string {
  if (item.imageUrl) return "photo";
  return item.audioUrl ? "voice" : item.role;
}

function EmptyStage({ characterName }: { characterName: string }) {
  return (
    <View className="items-center rounded-card border border-border border-dashed bg-card px-5 py-8">
      <Text className="font-ui-bold text-xs text-text-muted uppercase tracking-[2px]">
        The stage is set
      </Text>
      <Text className="mt-2 text-center font-main text-sm text-text-muted leading-normal">
        Open the scene with {characterName}. Put actions between *asterisks* and they read as
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
  isPainting = false,
  paintingStep = 0,
  paintingTotal = 0,
  onOpenPhoto,
}: ChatFeedProps) {
  const listRef = React.useRef<FlashListRef<ChatMessage>>(null);
  const liveEdgeRef = React.useRef(true);
  const draggingRef = React.useRef(false);
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

  // The reply is rendered by ListFooterComponent, not by a data row, and a
  // growing footer does not reliably raise onContentSizeChange. Following the
  // text itself is the only signal that is guaranteed to arrive on every token.
  // Deferred a frame so the footer has been laid out at its new height.
  // biome-ignore lint/correctness/useExhaustiveDependencies: streamingText is the trigger
  React.useEffect(() => {
    if (!isStreaming || !liveEdgeRef.current) return;
    const frame = requestAnimationFrame(() => {
      if (liveEdgeRef.current) followTail(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [streamingText, isStreaming, followTail]);

  // The keyboard shrinks the viewport without changing the content, so
  // onContentSizeChange never fires and the last message ends up hidden behind
  // the dock. Layout is the event that does fire, on every resize. Deferred a
  // frame because the list has not re-measured at the moment layout reports.
  const handleLayout = React.useCallback(() => {
    if (!liveEdgeRef.current) return;
    requestAnimationFrame(() => {
      if (liveEdgeRef.current) followTail(false);
    });
  }, [followTail]);

  // Only a real gesture takes the reader off the live edge. A reply that grows
  // faster than the list can scroll also reports a large distance from the
  // bottom, and reading that as "scrolled up" is what silently ended the follow
  // partway through a long reply.
  const handleScroll = React.useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const frame = {
      contentHeight: contentSize.height,
      viewportHeight: layoutMeasurement.height,
      offsetY: contentOffset.y,
    };
    const next = nextLiveEdge(frame, draggingRef.current, liveEdgeRef.current);
    if (next) draggingRef.current = false;
    if (next === liveEdgeRef.current) return;
    liveEdgeRef.current = next;
    setIsAtLiveEdge(next);
  }, []);

  const handleScrollBeginDrag = React.useCallback(() => {
    draggingRef.current = true;
  }, []);

  const handleMomentumScrollEnd = React.useCallback(() => {
    draggingRef.current = false;
  }, []);

  const jumpToLatest = React.useCallback(() => {
    draggingRef.current = false;
    liveEdgeRef.current = true;
    setIsAtLiveEdge(true);
    followTail(true);
  }, [followTail]);

  const renderItem = React.useCallback(
    ({ item }: { item: ChatMessage }) => <MessageCard message={item} onOpenPhoto={onOpenPhoto} />,
    [onOpenPhoto],
  );

  const footer = React.useMemo(() => {
    if (isPainting) {
      return (
        <PaintingCard
          step={paintingStep}
          total={paintingTotal}
          detail={statusDetail}
          characterId={characterId}
        />
      );
    }
    if (!isStreaming) return null;
    return (
      <StreamingMessageCard
        text={streamingText}
        status={statusDetail ?? STATUS_LINE[activeStatus] ?? null}
        characterId={characterId}
        isSynthesizingAudio={isSynthesizingAudio}
      />
    );
  }, [
    isPainting,
    paintingStep,
    paintingTotal,
    isStreaming,
    streamingText,
    statusDetail,
    activeStatus,
    characterId,
    isSynthesizingAudio,
  ]);

  const empty = React.useMemo(
    () => (isStreaming || isPainting ? null : <EmptyStage characterName={characterName} />),
    [isStreaming, isPainting, characterName],
  );

  return (
    <View className="flex-1" onLayout={handleLayout}>
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
          autoscrollToBottomThreshold: CHAT.autoscrollBottomThreshold,
          startRenderingFromBottom: true,
        }}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={32}
        showsVerticalScrollIndicator={false}
      />

      {isAtLiveEdge || messages.length === 0 ? null : (
        <JumpToLatest isStreaming={isStreaming} characterId={characterId} onPress={jumpToLatest} />
      )}
    </View>
  );
}
