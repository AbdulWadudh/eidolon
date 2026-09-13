import { AUTHOR_COPY, CHAT, EASING_BEZIER, FIELD_PADDING, UI_MS } from "@eidolon/config";
import { Text, TextInput, View } from "react-native";
import Animated, { cubicBezier, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { FieldAuthorRow } from "@/components/characters/FieldAuthorRow";
import type { FieldAuthor } from "@/hooks/use-field-author";
import { type Draft, FIELDS } from "@/store/character-draft";

export interface AuthoredFieldSpec {
  label: string;
  hint: string;
  lines: number;
}

import { useResolvedTheme } from "@/store/theme-store";

export type { Draft, FieldKey } from "@/store/character-draft";
export { EMPTY_DRAFT, FIELDS } from "@/store/character-draft";

export interface AuthoredFieldsProps<T extends Record<string, string>> {
  keys: (keyof T & string)[];
  fields: Record<string, AuthoredFieldSpec>;
  draft: T;
  characterId?: string;
  author?: FieldAuthor<never>;
  compact?: boolean;
  onChange: (patch: Partial<T>) => void;
}

export function CharacterFields(props: Omit<AuthoredFieldsProps<Draft>, "fields">) {
  return <AuthoredFields {...props} fields={FIELDS} />;
}

export function AuthoredFields<T extends Record<string, string>>({
  keys,
  fields,
  draft,
  characterId,
  author,
  compact = false,
  onChange,
}: AuthoredFieldsProps<T>) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();

  return (
    <View className={compact ? "gap-3" : "gap-3.5"}>
      {keys.map((key, position) => {
        const field = fields[key];
        if (!field) return null;
        const value = draft[key] as string;
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
            className={compact ? "gap-1.5" : "gap-1.5"}
          >
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <View className="flex-row items-center gap-2">
                  <Text
                    className={
                      compact
                        ? "font-ui-bold text-[12px] text-text-primary"
                        : "font-ui-bold text-[12px] text-text-primary"
                    }
                  >
                    {field.label}
                  </Text>
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
                {compact ? null : (
                  <Text className="mt-0.5 font-ui text-[10.5px] text-text-muted leading-[14px]">
                    {field.hint}
                  </Text>
                )}
              </View>

              {author ? (
                <FieldAuthorRow
                  characterId={characterId}
                  label={field.label}
                  hasText={filled}
                  isBusy={isBusy}
                  isLocked={author.busyField !== null && !isBusy}
                  stepsBack={author.stepsBack(key as never)}
                  onSuggest={() => author.run(key as never, "suggest")}
                  onEnhance={() => author.run(key as never, "enhance")}
                  onRevert={() => author.revert(key as never)}
                />
              ) : null}
            </View>

            <TextInput
              accessibilityLabel={field.label}
              value={value}
              onChangeText={(next) => onChange({ [key]: next } as Partial<T>)}
              multiline={field.lines > 1}
              editable={!isBusy}
              placeholderTextColor={theme.textMuted}
              cursorColor={theme.primary}
              selectionColor={theme.primary}
              textAlignVertical={field.lines > 1 ? "top" : "center"}
              className={
                compact
                  ? "rounded-button border border-border bg-input font-main text-[13px] text-text-primary leading-5"
                  : "rounded-button border border-border bg-input font-main text-[13.5px] text-text-primary leading-5"
              }
              style={{
                minHeight: compact
                  ? field.lines * FIELD_PADDING.compactLineHeightPx + FIELD_PADDING.compactBasePx
                  : Math.max(
                      CHAT.minTouchTargetPx,
                      field.lines * FIELD_PADDING.lineHeightPx + FIELD_PADDING.basePx,
                    ),
                paddingHorizontal: compact
                  ? FIELD_PADDING.compactHorizontal
                  : FIELD_PADDING.horizontal,
                paddingTop:
                  field.lines > 1
                    ? compact
                      ? FIELD_PADDING.compactMultilineTop
                      : FIELD_PADDING.multilineTop
                    : compact
                      ? FIELD_PADDING.compactVertical
                      : FIELD_PADDING.vertical,
                paddingBottom: compact ? FIELD_PADDING.compactVertical : FIELD_PADDING.vertical,
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
