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

  const focusMessageId = useChatStore((state) => state.focusMessageId);
  const clearFocus = useChatStore((state) => state.clearFocus);
  const focusIndex = React.useMemo(
    () => (focusMessageId ? messages.findIndex((entry) => entry.id === focusMessageId) : -1),
    [focusMessageId, messages],
  );

  React.useEffect(() => {
    if (!focusMessageId || focusIndex < 0) return;

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

  const handleContentSizeChange = React.useCallback(() => {
    if (!liveEdgeRef.current) return;
    followTail(false);
  }, [followTail]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: streamingText is the trigger
  React.useEffect(() => {
    if (!isStreaming || !liveEdgeRef.current) return;
    const frame = requestAnimationFrame(() => {
      if (liveEdgeRef.current) followTail(false);
    });
    return () => cancelAnimationFrame(frame);
  }, [streamingText, isStreaming, followTail]);

  const handleLayout = React.useCallback(() => {
    if (!liveEdgeRef.current) return;
    requestAnimationFrame(() => {
      if (liveEdgeRef.current) followTail(false);
    });
  }, [followTail]);

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
