import { AUTHOR_COPY, DASHBOARD_COPY } from "@eidolon/config";
import * as React from "react";
import { Text, TextInput, View } from "react-native";
import { MediaPreview } from "@/components/admin/MediaPreview";
import { FieldAuthorRow } from "@/components/characters/FieldAuthorRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SwitchRow } from "@/components/ui/switch";
import type { QueueField } from "@/store/admin-api";
import { useResolvedTheme } from "@/store/theme-store";

const MULTILINE_AT = 60;
const MULTILINE_MIN_PX = 120;

export interface QueueJobInputProps {
  fields: QueueField[];
  canEdit: boolean;
  authorable: (field: string) => boolean;
  busyField: string | null;
  authorError: string | null;
  stepsBack: (field: string) => number;
  onAuthor: (field: string, mode: "suggest" | "enhance", draft: string) => Promise<string | null>;
  onRevert: (field: string) => string | null;
  onSave: (patch: Record<string, unknown>, retry: boolean) => void;
}

type Draft = Record<string, string | boolean>;

function seed(fields: QueueField[]): Draft {
  const draft: Draft = {};

  for (const field of fields) {
    if (!field.editable) continue;
    draft[field.label] = field.kind === "boolean" ? field.value === "true" : field.value;
  }

  return draft;
}

function coerce(field: QueueField, held: string | boolean): unknown {
  if (field.kind === "boolean") return held === true;
  if (field.kind === "number") return Number(held);
  return String(held);
}

export function QueueJobInput({
  fields,
  canEdit,
  authorable,
  busyField,
  authorError,
  stepsBack,
  onAuthor,
  onRevert,
  onSave,
}: QueueJobInputProps) {
  const theme = useResolvedTheme();
  const [draft, setDraft] = React.useState<Draft>(() => seed(fields));

  React.useEffect(() => setDraft(seed(fields)), [fields]);

  const author = React.useCallback(
    (field: string, mode: "suggest" | "enhance") => {
      void onAuthor(field, mode, String(draft[field] ?? "")).then((text) => {
        if (text !== null) setDraft((current) => ({ ...current, [field]: text }));
      });
    },
    [draft, onAuthor],
  );

  const revert = React.useCallback(
    (field: string) => {
      const previous = onRevert(field);
      if (previous !== null) setDraft((current) => ({ ...current, [field]: previous }));
    },
    [onRevert],
  );

  const changed = React.useMemo(() => {
    const patch: Record<string, unknown> = {};

    for (const field of fields) {
      if (!field.editable) continue;
      const held = draft[field.label];
      if (held === undefined) continue;

      const original = field.kind === "boolean" ? field.value === "true" : field.value;
      if (held !== original) patch[field.label] = coerce(field, held);
    }

    return patch;
  }, [draft, fields]);

  const dirty = Object.keys(changed).length > 0;

  if (fields.length === 0) return null;

  return (
    <View className="gap-2">
      <Text className="font-ui-bold text-[10px] text-text-muted uppercase tracking-wider">
        {canEdit ? DASHBOARD_COPY.queueEdit : "Input"}
      </Text>

      {fields.map((field) =>
        canEdit && field.editable ? (
          <View className="gap-1" key={field.label}>
            <View className="flex-row items-center justify-between gap-2">
              <Text className="flex-1 font-ui text-[10px] text-text-muted">{field.label}</Text>
              {authorable(field.label) ? (
                <FieldAuthorRow
                  label={field.label}
                  hasText={String(draft[field.label] ?? "").trim().length > 0}
                  isBusy={busyField === field.label}
                  isLocked={busyField !== null && busyField !== field.label}
                  stepsBack={stepsBack(field.label)}
                  onSuggest={() => author(field.label, "suggest")}
                  onEnhance={() => author(field.label, "enhance")}
                  onRevert={() => revert(field.label)}
                />
              ) : null}
            </View>
            {field.kind === "boolean" ? (
              <SwitchRow
                label={field.label}
                value={draft[field.label] === true}
                onValueChange={(next) =>
                  setDraft((current) => ({ ...current, [field.label]: next }))
                }
                accessibilityLabel={field.label}
              />
            ) : field.kind === "string" && field.value.length > MULTILINE_AT ? (
              <TextInput
                accessibilityLabel={field.label}
                value={String(draft[field.label] ?? "")}
                onChangeText={(next) =>
                  setDraft((current) => ({ ...current, [field.label]: next }))
                }
                multiline
                scrollEnabled
                textAlignVertical="top"
                placeholderTextColor={theme.textMuted}
                cursorColor={theme.primary}
                selectionColor={theme.primary}
                style={{ minHeight: MULTILINE_MIN_PX }}
                className="rounded-input border border-border bg-input-surface p-3 font-ui text-[11px] text-text-primary leading-4"
              />
            ) : (
              <Input
                value={String(draft[field.label] ?? "")}
                onChangeText={(next) =>
                  setDraft((current) => ({ ...current, [field.label]: next }))
                }
                keyboardType={field.kind === "number" ? "numeric" : "default"}
                autoCapitalize="none"
                autoCorrect={false}
              />
            )}
          </View>
        ) : (
          <View className="flex-row items-start gap-2" key={field.label}>
            <Text className="w-24 font-ui text-[10px] text-text-muted">{field.label}</Text>
            <View className="flex-1">
              <MediaPreview value={field.value} />
            </View>
          </View>
        ),
      )}

      {canEdit ? (
        <>
          {authorError !== null ? (
            <Text accessibilityLiveRegion="polite" className="font-ui text-[10px] text-danger">
              {authorError.length > 0 ? authorError : AUTHOR_COPY.failed}
            </Text>
          ) : null}

          <Text className="font-ui text-[10px] text-text-muted">
            {DASHBOARD_COPY.queueEditHint}
          </Text>
          <View className="flex-row items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={!dirty}
              onPress={() => onSave(changed, false)}
            >
              {DASHBOARD_COPY.queueSave}
            </Button>
            <Button variant="default" size="sm" onPress={() => onSave(changed, true)}>
              {DASHBOARD_COPY.queueSaveRetry}
            </Button>
          </View>
        </>
      ) : null}
    </View>
  );
}
