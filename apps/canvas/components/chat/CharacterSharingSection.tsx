import { CHARACTER_COPY } from "@eidolon/config";
import { Text, View } from "react-native";
import { GlassSurface } from "@/components/ui/glass-surface";
import { SwitchRow } from "@/components/ui/switch";

export interface CharacterSharingSectionProps {
  characterId: string;
  isPublic: boolean;
  isMine: boolean;
  onPublish: (isPublic: boolean) => void;
}

export function CharacterSharingSection({
  characterId,
  isPublic,
  isMine,
  onPublish,
}: CharacterSharingSectionProps) {
  return (
    <View className="gap-4">
      <GlassSurface tint="input" className="rounded-card border border-border p-4">
        <SwitchRow
          characterId={characterId}
          label={CHARACTER_COPY.publishLabel}
          hint={isMine ? CHARACTER_COPY.publishHint : CHARACTER_COPY.publishHintTheirs}
          value={isPublic}
          disabled={!isMine}
          onValueChange={onPublish}
          accessibilityLabel={CHARACTER_COPY.publishLabel}
        />
      </GlassSurface>

      {isMine ? null : (
        <Text className="font-ui text-[11px] text-text-muted leading-4">
          {CHARACTER_COPY.forkWarning}
        </Text>
      )}
    </View>
  );
}
