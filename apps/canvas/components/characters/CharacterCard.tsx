import { affinityLabel, HOME_COPY } from "@eidolon/config";
import { Image } from "expo-image";
import { StyleSheet, Text, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GlassSurface } from "@/components/ui/glass-surface";
import { avatarImageProps, usableCrop } from "@/lib/avatar-crop";
import { MoreVerticalIcon } from "@/lib/icons";
import { useAffinityStore } from "@/store/affinity-store";
import type { CharacterSummary } from "@/store/character-api";
import { useResolvedTheme } from "@/store/theme-store";

const AVATAR_PX = 44;
const OVERFLOW_PX = 32;

export interface CharacterCardProps {
  character: CharacterSummary;
  onOpen: () => void;
  onEdit: () => void;
}

export function CharacterRosterCard({ character, onOpen, onEdit }: CharacterCardProps) {
  const theme = useResolvedTheme();
  const insight = useAffinityStore((state) => state.isInsightModeEnabled);
  const initials = character.name.slice(0, 2).toUpperCase();
  const crop = usableCrop(character.avatarCrop);

  const subtitle =
    insight && character.tier
      ? affinityLabel(character.tier, character.affinity)
      : character.tagline || HOME_COPY.ready;

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`Open your chat with ${character.name}`}
      onPress={onOpen}
      className="overflow-hidden rounded-card border border-border p-2.5"
    >
      <GlassSurface tint="card" pointerEvents="none" style={StyleSheet.absoluteFill} />
      <View className="flex-row items-center gap-3">
        <Avatar size={AVATAR_PX} className="overflow-hidden border border-border">
          {character.avatarUrl ? (
            <Image
              source={{ uri: character.avatarUrl }}
              {...avatarImageProps(crop, AVATAR_PX)}
              cachePolicy="disk"
              accessibilityLabel={`${character.name}'s picture`}
            />
          ) : (
            <AvatarFallback textClassName="font-main-bold text-base text-primary">
              {initials}
            </AvatarFallback>
          )}
        </Avatar>

        <View className="flex-1">
          <Text className="font-main-bold text-base text-text-primary" numberOfLines={1}>
            {character.name}
          </Text>

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

        <View className="flex-row items-center gap-1.5">
          {character.messageCount > 0 ? (
            <Badge
              variant="muted"
              accessibilityLabel={`${character.messageCount} messages so far`}
            >{`${character.messageCount}`}</Badge>
          ) : null}

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={`Edit ${character.name}`}
            hitSlop={10}
            onPress={onEdit}
            className="items-center justify-center rounded-button active:bg-input"
            style={{ height: OVERFLOW_PX, width: OVERFLOW_PX }}
          >
            <AppIcon icon={MoreVerticalIcon} size={17} color={theme.textMuted} strokeWidth={1.6} />
          </PressableScale>
        </View>
      </View>
    </PressableScale>
  );
}
