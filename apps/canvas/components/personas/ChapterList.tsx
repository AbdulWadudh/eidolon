import { PERSONA_COPY, UI_MS } from "@eidolon/config";
import * as React from "react";
import { Text, TextInput, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { AuthorButtons } from "@/components/chat/mind/AuthorButtons";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Button } from "@/components/ui/button";
import { useTextAuthor } from "@/hooks/use-text-author";
import { AddCircleIcon, Delete02Icon } from "@/lib/icons";
import type { PersonaChapter } from "@/store/persona-api";
import { useResolvedTheme } from "@/store/theme-store";

const AUTHOR_SLOT_PX = 72;

export interface ChapterListProps {
  serverHost: string;
  chapters: PersonaChapter[];
  onAdd: (chapter: { title: string | null; body: string }) => void;
  onSave: (chapterId: string, patch: { title?: string | null; body?: string }) => void;
  onRemove: (chapter: PersonaChapter) => void;
}

export function ChapterList({ serverHost, chapters, onAdd, onSave, onRemove }: ChapterListProps) {
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();
  const author = useTextAuthor(serverHost, "personaChapter");

  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");

  const add = React.useCallback(() => {
    if (body.trim().length === 0) return;
    onAdd({ title: title.trim() || null, body: body.trim() });
    setTitle("");
    setBody("");
  }, [title, body, onAdd]);

  return (
    <View className="gap-3">
      <View>
        <Text className="font-ui-bold text-[12px] text-text-primary">
          {PERSONA_COPY.chaptersTitle}
        </Text>
        <Text className="mt-0.5 font-ui text-[10.5px] text-text-muted leading-[14px]">
          {PERSONA_COPY.chaptersBlurb}
        </Text>
      </View>

      {chapters.length === 0 ? (
        <View className="rounded-card border border-border border-dashed px-4 py-5">
          <Text className="text-center font-main text-[13px] text-text-muted leading-5">
            {PERSONA_COPY.chapterEmpty}
          </Text>
        </View>
      ) : (
        chapters.map((chapter, position) => (
          <Animated.View
            key={chapter.id}
            entering={
              reduced
                ? undefined
                : FadeInDown.duration(UI_MS.disclosure).delay(position * UI_MS.revealStagger)
            }
            className="gap-2 rounded-card border border-border p-3"
            style={{ backgroundColor: theme.card }}
          >
            <View className="flex-row items-center gap-2">
              <Text className="font-ui-bold text-[11px]" style={{ color: theme.primary }}>
                {position + 1}
              </Text>

              <TextInput
                accessibilityLabel={PERSONA_COPY.chapterTitlePlaceholder}
                defaultValue={chapter.title ?? ""}
                onEndEditing={(event) =>
                  onSave(chapter.id, { title: event.nativeEvent.text.trim() || null })
                }
                placeholder={PERSONA_COPY.chapterTitlePlaceholder}
                placeholderTextColor={theme.textMuted}
                cursorColor={theme.primary}
                selectionColor={theme.primary}
                className="flex-1 font-ui-bold text-[13px] text-text-primary"
                style={{ paddingVertical: 0, includeFontPadding: false }}
              />

              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={PERSONA_COPY.chapterRemove}
                hitSlop={10}
                onPress={() => onRemove(chapter)}
                className="h-8 w-8 items-center justify-center rounded-full active:bg-input"
              >
                <AppIcon icon={Delete02Icon} size={15} color={theme.danger} strokeWidth={1.6} />
              </PressableScale>
            </View>

            <TextInput
              accessibilityLabel={PERSONA_COPY.chapterBodyPlaceholder}
              defaultValue={chapter.body}
              onEndEditing={(event) => {
                const next = event.nativeEvent.text.trim();
                if (next.length > 0 && next !== chapter.body) onSave(chapter.id, { body: next });
              }}
              multiline
              placeholder={PERSONA_COPY.chapterBodyPlaceholder}
              placeholderTextColor={theme.textMuted}
              cursorColor={theme.primary}
              selectionColor={theme.primary}
              textAlignVertical="top"
              className="rounded-button border border-border bg-input px-3 font-main text-[13px] text-text-primary leading-5"
              style={{ minHeight: 68, paddingTop: 8, paddingBottom: 8 }}
            />
          </Animated.View>
        ))
      )}

      <View className="gap-2 rounded-card border border-border border-dashed p-3">
        <TextInput
          accessibilityLabel={PERSONA_COPY.chapterTitlePlaceholder}
          value={title}
          onChangeText={setTitle}
          placeholder={PERSONA_COPY.chapterTitlePlaceholder}
          placeholderTextColor={theme.textMuted}
          cursorColor={theme.primary}
          selectionColor={theme.primary}
          className="rounded-button border border-border bg-input px-3 font-ui-bold text-[13px] text-text-primary"
          style={{ height: 40, paddingVertical: 0, includeFontPadding: false }}
        />

        <View className="relative">
          <TextInput
            accessibilityLabel={PERSONA_COPY.chapterBodyPlaceholder}
            value={body}
            onChangeText={setBody}
            multiline
            placeholder={PERSONA_COPY.chapterBodyPlaceholder}
            placeholderTextColor={theme.textMuted}
            cursorColor={theme.primary}
            selectionColor={theme.primary}
            textAlignVertical="top"
            className="rounded-button border border-border bg-input px-3 font-main text-[13px] text-text-primary leading-5"
            style={{
              minHeight: 72,
              paddingTop: 8,
              paddingBottom: 8,
              paddingRight: AUTHOR_SLOT_PX,
            }}
          />

          <View className="absolute right-2 bottom-1.5">
            <AuthorButtons author={author} draft={body} onText={setBody} />
          </View>
        </View>

        <Button
          variant="secondary"
          size="sm"
          className="flex-row gap-2"
          disabled={body.trim().length === 0}
          onPress={add}
        >
          <AppIcon icon={AddCircleIcon} size={14} color={theme.textPrimary} />
          <Text className="font-ui-medium text-text-primary text-xs">
            {PERSONA_COPY.chapterAdd}
          </Text>
        </Button>
      </View>
    </View>
  );
}
