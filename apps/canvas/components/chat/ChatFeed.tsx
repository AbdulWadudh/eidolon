import { CHAT, STATUS_COPY } from "@eidolon/config";
import { FlashList, type FlashListRef } from "@shopify/flash-list";
import * as React from "react";
import { type NativeScrollEvent, type NativeSyntheticEvent, View } from "react-native";
import { trackLiveEdge } from "@/lib/feed-scroll";
import type { ChatMessage } from "@/store/chat-messages";
import { useChatStore } from "@/store/chat-store";
import { ChatFeedEmpty } from "./ChatFeedEmpty";
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
  isLoadingHistory?: boolean;
  loadError?: string | null;
  onRetryLoad?: () => void;
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
  isLoadingHistory = false,
  loadError = null,
  onRetryLoad,
  paintingStep = 0,
  paintingTotal = 0,
  onOpenPhoto,
}: ChatFeedProps) {
  const listRef = React.useRef<FlashListRef<ChatMessage>>(null);
  const liveEdgeRef = React.useRef(true);
  const draggingRef = React.useRef(false);
  const focusingRef = React.useRef(false);
  const [isAtLiveEdge, setIsAtLiveEdge] = React.useState(true);

  // Opening a photo from her profile asks the feed to land on the message it
  // came from. FlashList cannot scroll to an index it has not measured, and a
  // screen that has just mounted has measured almost nothing, so this keeps
  // asking for a short while rather than firing once and hoping.
  const focusMessageId = useChatStore((state) => state.focusMessageId);
  const clearFocus = useChatStore((state) => state.clearFocus);
  const focusIndex = React.useMemo(
    () => (focusMessageId ? messages.findIndex((entry) => entry.id === focusMessageId) : -1),
    [focusMessageId, messages],
  );

  React.useEffect(() => {
    if (!focusMessageId || focusIndex < 0) return;

    // Landing on an older message means leaving the live edge, or the next
    // content change would pull the reader straight back to the bottom.
    //
    // The jump also has to be shielded from its own scroll events. It starts at
    // the bottom, so the first frames of the animation are still inside the live
    // edge; reading those re-armed the follow, and the reader was carried back
    // down a moment after arriving.
    focusingRef.current = true;
    liveEdgeRef.current = false;
    setIsAtLiveEdge(false);

    let attempts = 0;
    let release: ReturnType<typeof setTimeout> | null = null;
    const timer = setInterval(() => {
      attempts += 1;
      listRef.current?.scrollToIndex({ index: focusIndex, animated: true, viewPosition: 0.5 });

      if (attempts < CHAT.focusScrollAttempts) return;

      clearInterval(timer);
      clearFocus();

      // Released a beat after the last jump, so the tail of the animation is
      // not read as the reader choosing to be at the bottom.
      release = setTimeout(() => {
        focusingRef.current = false;
      }, CHAT.focusSettleMs);
    }, CHAT.focusScrollDelayMs);

    return () => {
      clearInterval(timer);
      if (release) clearTimeout(release);
      focusingRef.current = false;
    };
  }, [focusMessageId, focusIndex, clearFocus]);

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
    const next = trackLiveEdge(frame, {
      isDragging: draggingRef.current,
      isFocusing: focusingRef.current,
      current: liveEdgeRef.current,
    });
    if (next) draggingRef.current = false;
    if (next === liveEdgeRef.current) return;
    liveEdgeRef.current = next;
    setIsAtLiveEdge(next);
  }, []);

  // Leaving the live edge here rather than waiting for the next onScroll. A
  // fast flick renders more rows, which raises onContentSizeChange before the
  // throttled scroll event has arrived; the follow then read the edge as still
  // live and yanked the reader back to the bottom mid-gesture. A drag that ends
  // up near the bottom anyway restores it on the very next frame, because
  // nextLiveEdge returns true whenever the frame is within the threshold.
  const handleScrollBeginDrag = React.useCallback(() => {
    draggingRef.current = true;
    if (!liveEdgeRef.current) return;
    liveEdgeRef.current = false;
    setIsAtLiveEdge(false);
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

  // A transcript that has not arrived is not an empty one, and the difference
  // matters: the empty stage invites the reader to start a conversation they
  // may already have had.
  const empty = React.useMemo(
    () =>
      isStreaming || isPainting ? null : (
        <ChatFeedEmpty
          characterId={characterId}
          characterName={characterName}
          isLoadingHistory={isLoadingHistory}
          loadError={loadError}
          onRetryLoad={onRetryLoad}
        />
      ),
    [isStreaming, isPainting, isLoadingHistory, loadError, onRetryLoad, characterId, characterName],
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
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 8,
          paddingBottom: 16,
          // Only while empty, so the placeholder can be given the list's height
          // and sit at the bottom where the conversation will appear. Applied
          // unconditionally it would change how a real transcript lays out.
          ...(messages.length === 0 ? { flexGrow: 1 } : {}),
        }}
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
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      />

      {isAtLiveEdge || messages.length === 0 ? null : (
        <JumpToLatest isStreaming={isStreaming} characterId={characterId} onPress={jumpToLatest} />
      )}
    </View>
  );
}
