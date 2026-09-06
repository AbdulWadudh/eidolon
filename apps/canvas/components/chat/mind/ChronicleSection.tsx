import { MIND_COPY } from "@eidolon/config";
import { Text, View } from "react-native";
import type { ChapterView } from "@/store/mind-api";
import { useResolvedTheme } from "@/store/theme-store";

export interface ChronicleSectionProps {
  characterId: string;
  chapters: ChapterView[];
}

export function ChronicleSection({ characterId, chapters }: ChronicleSectionProps) {
  const theme = useResolvedTheme(characterId);

  return (
    <View className="gap-3">
      <Text className="font-ui-bold text-text-muted text-xs uppercase tracking-[1.5px]">
        {MIND_COPY.chronicleHeading}
      </Text>

      {chapters.length === 0 ? (
        <Text className="font-ui text-text-muted text-xs">{MIND_COPY.chronicleEmpty}</Text>
      ) : (
        <View className="gap-2">
          {chapters.map((chapter) => (
            <View
              key={chapter.id}
              className="gap-2 rounded-card border border-border bg-input px-3 py-3"
            >
              <Text
                className="font-ui-bold text-[11px] uppercase tracking-[1.2px]"
                style={{ color: theme.primary }}
              >
                {`${MIND_COPY.chapterLabel} ${chapter.chapterIndex}`}
              </Text>
              {chapter.bullets.map((bullet) => (
                <View key={`${chapter.id}-${bullet}`} className="flex-row gap-2">
                  <Text className="font-ui text-sm" style={{ color: theme.primary }}>
                    ·
                  </Text>
                  <Text className="flex-1 font-main text-sm text-text-primary">{bullet}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
