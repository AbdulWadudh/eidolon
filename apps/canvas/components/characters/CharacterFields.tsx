import { AUTHOR_COPY, CHAT, EASING_BEZIER, FIELD_PADDING, UI_MS } from "@eidolon/config";
import { Text, TextInput, View } from "react-native";
import Animated, { cubicBezier, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { FieldAuthorRow } from "@/components/characters/FieldAuthorRow";
import type { FieldAuthor } from "@/hooks/use-field-author";
import { type Draft, FIELDS, type FieldKey } from "@/store/character-draft";
import { useResolvedTheme } from "@/store/theme-store";

export type { Draft, FieldKey } from "@/store/character-draft";
export { EMPTY_DRAFT, FIELDS } from "@/store/character-draft";

export interface CharacterFieldsProps {
  keys: FieldKey[];
  draft: Draft;
  characterId?: string;
  author?: FieldAuthor;
  onChange: (patch: Partial<Draft>) => void;
}

export function CharacterFields({
  keys,
  draft,
  characterId,
  author,
  onChange,
}: CharacterFieldsProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();

  return (
    <View className="gap-4">
      {keys.map((key, position) => {
        const field = FIELDS[key];
        const value = draft[key];
        const filled = value.trim().length > 0;
        const isBusy = author?.busyField === key;

        return (
          <Animated.View
            key={key}
            entering={
              reduced
                ? undefined
                : FadeInDown.duration(UI_MS.disclosure).delay(position * UI_MS.revealStagger)
            }
            className="gap-2"
          >
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text className="font-ui-bold text-[13px] text-text-primary">{field.label}</Text>
                  <Animated.View
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor: filled ? theme.primary : theme.cardBorder,
                      ...(reduced
                        ? {}
                        : {
                            transitionProperty: ["backgroundColor"] as const,
                            transitionDuration: UI_MS.disclosure,
                            transitionTimingFunction: cubicBezier(...EASING_BEZIER.out),
                          }),
                    }}
                  />
                </View>
                <Text className="mt-1 font-ui text-[11px] text-text-muted leading-4">
                  {field.hint}
                </Text>
              </View>

              {author ? (
                <FieldAuthorRow
                  characterId={characterId}
                  label={field.label}
                  hasText={filled}
                  isBusy={isBusy}
                  isLocked={author.busyField !== null && !isBusy}
                  stepsBack={author.stepsBack(key)}
                  onSuggest={() => author.run(key, "suggest")}
                  onEnhance={() => author.run(key, "enhance")}
                  onRevert={() => author.revert(key)}
                />
              ) : null}
            </View>

            <TextInput
              accessibilityLabel={field.label}
              value={value}
              onChangeText={(next) => onChange({ [key]: next } as Partial<Draft>)}
              multiline={field.lines > 1}
              editable={!isBusy}
              placeholderTextColor={theme.textMuted}
              cursorColor={theme.primary}
              selectionColor={theme.primary}
              textAlignVertical={field.lines > 1 ? "top" : "center"}
              className="rounded-button border border-border bg-input font-main text-[15px] text-text-primary leading-6"
              // Set here rather than through classes: a multiline TextInput on
              // Android carries its own padding, which overrode the class and
              // left the text against the edge of the box.
              style={{
                minHeight: Math.max(CHAT.minTouchTargetPx + 8, field.lines * 24 + 30),
                paddingHorizontal: FIELD_PADDING.horizontal,
                paddingTop: field.lines > 1 ? FIELD_PADDING.multilineTop : FIELD_PADDING.vertical,
                paddingBottom: FIELD_PADDING.vertical,
                opacity: isBusy ? 0.5 : 1,
              }}
            />
          </Animated.View>
        );
      })}

      {author?.error !== undefined && author?.error !== null ? (
        <Animated.Text
          entering={reduced ? undefined : FadeInDown.duration(UI_MS.disclosure)}
          accessibilityLiveRegion="polite"
          className="font-ui text-[11px] text-text-muted"
        >
          {author.error.length > 0 ? author.error : AUTHOR_COPY.failed}
        </Animated.Text>
      ) : null}
    </View>
  );
}
