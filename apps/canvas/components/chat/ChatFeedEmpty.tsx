import { GALLERY_COPY } from "@eidolon/config";
import { Text } from "react-native";
import { LoadFailed, LoadingState } from "@/components/common/loading-state";
import { GlassSurface } from "@/components/ui/glass-surface";

function EmptyStage({ characterName }: { characterName: string }) {
  return (
    <GlassSurface className="items-center rounded-card border border-border border-dashed px-5 py-8">
      <Text className="font-ui-bold text-text-muted text-xs uppercase tracking-[2px]">
        The stage is set
      </Text>
      <Text className="mt-2 text-center font-main text-sm text-text-muted leading-normal">
        Open the scene with {characterName}. Put actions between *asterisks* and they read as
        narration.
      </Text>
    </GlassSurface>
  );
}

export interface ChatFeedEmptyProps {
  characterId: string;
  characterName: string;
  isLoadingHistory: boolean;
  loadError: string | null;
  onRetryLoad?: (() => void) | undefined;
}

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
