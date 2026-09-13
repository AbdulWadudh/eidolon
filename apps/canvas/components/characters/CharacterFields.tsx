import { AUTHOR_COPY, UI_MS } from "@eidolon/config";
import { View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { AuthoredField } from "@/components/common/authored-field";
import type { FieldAuthor } from "@/hooks/use-field-author";
import { type Draft, FIELDS } from "@/store/character-draft";

export interface AuthoredFieldSpec {
  label: string;
  hint: string;
  lines: number;
}

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
  const reduced = useReducedMotion();

  return (
    <View className={compact ? "gap-3" : "gap-3.5"}>
      {keys.map((key, position) => {
        const field = fields[key];
        if (!field) return null;

        const value = draft[key] as string;
        const isBusy = author?.busyField === key;

        return (
          <Animated.View
            key={key}
            entering={
              reduced
                ? undefined
                : FadeInDown.duration(UI_MS.disclosure).delay(position * UI_MS.revealStagger)
            }
          >
            <AuthoredField
              characterId={characterId}
              label={field.label}
              hint={compact ? undefined : field.hint}
              lines={field.lines}
              value={value}
              placeholder={field.hint}
              onChangeText={(next) => onChange({ [key]: next } as Partial<T>)}
              actions={{
                hasText: value.trim().length > 0,
                isBusy: isBusy ?? false,
                isLocked: author ? author.busyField !== null && !isBusy : false,
                stepsBack: author?.stepsBack(key as never) ?? 0,
                onSuggest: () => author?.run(key as never, "suggest"),
                onEnhance: () => author?.run(key as never, "enhance"),
                onRevert: () => author?.revert(key as never),
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
