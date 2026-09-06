import { MIND_COPY } from "@eidolon/config";
import { Text, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { SquareLock01Icon } from "@/lib/icons";
import type { LoreView } from "@/store/mind-api";
import { useResolvedTheme } from "@/store/theme-store";

export interface LoreSectionProps {
  characterId: string;
  entries: LoreView[];
}

function LockedCard({ entry, tint }: { entry: LoreView; tint: string }) {
  return (
    <View className="flex-row items-center gap-2.5 rounded-card border border-border bg-input px-3 py-3">
      <AppIcon icon={SquareLock01Icon} size={16} color={tint} strokeWidth={1.8} />
      <Text className="flex-1 font-ui text-text-muted text-xs" numberOfLines={2}>
        {`${MIND_COPY.loreLockedPrefix} · requires ${entry.requiredTier} ${MIND_COPY.loreLockedSuffix}`}
      </Text>
    </View>
  );
}

function UnlockedCard({ entry }: { entry: LoreView }) {
  return (
    <View className="gap-1.5 rounded-card border border-border bg-input px-3 py-3">
      <Text className="font-main text-sm text-text-primary">{entry.content}</Text>
      {entry.keys.length > 0 ? (
        <Text className="font-ui text-[11px] text-text-muted" numberOfLines={1}>
          {`${MIND_COPY.loreKeysLabel} ${entry.keys.join(", ")}`}
        </Text>
      ) : null}
    </View>
  );
}

export function LoreSection({ characterId, entries }: LoreSectionProps) {
  const theme = useResolvedTheme(characterId);
  const active = entries.filter((entry) => entry.isActive);

  return (
    <View className="gap-3">
      <Text className="font-ui-bold text-text-muted text-xs uppercase tracking-[1.5px]">
        {MIND_COPY.loreHeading}
      </Text>

      {active.length === 0 ? (
        <Text className="font-ui text-text-muted text-xs">{MIND_COPY.loreEmpty}</Text>
      ) : (
        <View className="gap-2">
          {active.map((entry) =>
            entry.isUnlocked ? (
              <UnlockedCard key={entry.id} entry={entry} />
            ) : (
              <LockedCard key={entry.id} entry={entry} tint={theme.textMuted} />
            ),
          )}
        </View>
      )}
    </View>
  );
}
