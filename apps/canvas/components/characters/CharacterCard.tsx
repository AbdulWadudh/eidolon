import { affinityLabel, HOME_COPY } from "@eidolon/config";
import { Image } from "expo-image";
import { Text, View } from "react-native";
import { PressableScale } from "@/components/common/pressable-scale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAffinityStore } from "@/store/affinity-store";
import type { CharacterSummary } from "@/store/character-api";

const AVATAR_PX = 56;

export interface CharacterCardProps {
  character: CharacterSummary;
  onOpen: () => void;
  onEdit: () => void;
}

export function CharacterRosterCard({ character, onOpen, onEdit }: CharacterCardProps) {
  const insight = useAffinityStore((state) => state.isInsightModeEnabled);
  const initials = character.name.slice(0, 2).toUpperCase();

  const subtitle =
    insight && character.tier
      ? affinityLabel(character.tier, character.affinity)
      : character.tagline || HOME_COPY.ready;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Open your chat with ${character.name}`}
      onPress={onOpen}
      className="rounded-card border border-border bg-card p-4"
    >
      <View className="flex-row items-center gap-4">
        <Avatar size={AVATAR_PX} className="overflow-hidden border border-border">
          {character.avatarUrl ? (
            <Image
              source={{ uri: character.avatarUrl }}
              contentFit="cover"
              cachePolicy="disk"
              accessibilityLabel={`${character.name}'s picture`}
              style={{ width: "100%", height: "100%" }}
            />
          ) : (
            <AvatarFallback textClassName="font-main-bold text-lg text-primary">
              {initials}
            </AvatarFallback>
          )}
        </Avatar>

        <View className="flex-1">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="flex-1 font-main-bold text-lg text-text-primary" numberOfLines={1}>
              {character.name}
            </Text>
            {character.messageCount > 0 ? (
              <Badge variant="muted">{`${character.messageCount}`}</Badge>
            ) : null}
          </View>

          <Text
            className={
              insight && character.tier
                ? "mt-0.5 font-ui-bold text-primary text-xs"
                : "mt-0.5 font-ui text-text-muted text-xs"
            }
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        </View>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Edit ${character.name}`}
          hitSlop={10}
          onPress={onEdit}
          className="h-10 w-10 items-center justify-center rounded-button border border-border bg-input"
        >
          <Text className="font-ui text-sm text-text-muted">⋯</Text>
        </PressableScale>
      </View>
    </PressableScale>
  );
}
