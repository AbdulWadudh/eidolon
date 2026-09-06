import { GALLERY_COPY } from "@eidolon/config";
import { Text, View } from "react-native";
import { LoadFailed, LoadingState } from "@/components/common/loading-state";

function EmptyStage({ characterName }: { characterName: string }) {
  return (
    <View className="items-center rounded-card border border-border border-dashed bg-card px-5 py-8">
      <Text className="font-ui-bold text-text-muted text-xs uppercase tracking-[2px]">
        The stage is set
      </Text>
      <Text className="mt-2 text-center font-main text-sm text-text-muted leading-normal">
        Open the scene with {characterName}. Put actions between *asterisks* and they read as
        narration.
      </Text>
    </View>
  );
}

export interface ChatFeedEmptyProps {
  characterId: string;
  characterName: string;
  isLoadingHistory: boolean;
  loadError: string | null;
  onRetryLoad?: (() => void) | undefined;
}

/**
 * Three different nothings, and telling them apart is the whole point: still
 * arriving, could not arrive, and genuinely nothing yet. Only the last is an
 * invitation to start talking — showing it for the other two told a reader
 * their history was gone when it was merely late.
 */
export function ChatFeedEmpty({
  characterId,
  characterName,
  isLoadingHistory,
  loadError,
  onRetryLoad,
}: ChatFeedEmptyProps) {
  if (isLoadingHistory) {
    return <LoadingState label={GALLERY_COPY.loadingChat} characterId={characterId} />;
  }

  if (loadError && onRetryLoad) {
    return (
      <LoadFailed
        message={GALLERY_COPY.loadFailed}
        retryLabel={GALLERY_COPY.retry}
        characterId={characterId}
        onRetry={onRetryLoad}
      />
    );
  }

  return <EmptyStage characterName={characterName} />;
}
