import { CHARACTER_COPY } from "@eidolon/config";
import { Text, View } from "react-native";
import { SwitchRow } from "@/components/ui/switch";

export interface CharacterSharingSectionProps {
  characterId: string;
  isPublic: boolean;
  /** False when somebody else wrote her, which is what makes saving fork. */
  isMine: boolean;
  onPublish: (isPublic: boolean) => void;
}

/**
 * Anyone who can see a character may edit her. What changes with authorship is
 * only what saving does, and who may publish — so this section explains that
 * rather than locking the fields.
 */
export function CharacterSharingSection({
  characterId,
  isPublic,
  isMine,
  onPublish,
}: CharacterSharingSectionProps) {
  return (
    <View className="gap-4">
      <View className="rounded-card border border-border bg-input p-4">
        <SwitchRow
          characterId={characterId}
          label={CHARACTER_COPY.publishLabel}
          hint={isMine ? CHARACTER_COPY.publishHint : CHARACTER_COPY.publishHintTheirs}
          value={isPublic}
          disabled={!isMine}
          onValueChange={onPublish}
          accessibilityLabel={CHARACTER_COPY.publishLabel}
        />
      </View>

      {isMine ? null : (
        <Text className="font-ui text-[11px] text-text-muted leading-4">
          {CHARACTER_COPY.forkWarning}
        </Text>
      )}
    </View>
  );
}
