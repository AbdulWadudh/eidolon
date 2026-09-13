import { MIND_COPY } from "@eidolon/config";
import * as React from "react";
import { Text, TextInput, View } from "react-native";
import { AuthorButtons } from "@/components/chat/mind/AuthorButtons";
import { AddRowButton, RowActions } from "@/components/chat/mind/RowActions";
import { AppIcon } from "@/components/common/icon";
import { useTextAuthor } from "@/hooks/use-text-author";
import { useVoice } from "@/hooks/use-voice";
import { SquareLock01Icon } from "@/lib/icons";
import type { LoreDraft, LoreView } from "@/store/mind-api";
import { useResolvedTheme } from "@/store/theme-store";

const NEW_ENTRY = "new";

interface Draft {
  keys: string;
  content: string;
  gate: string;
}

const EMPTY: Draft = { keys: "", content: "", gate: "0" };

function toPayload(draft: Draft): LoreDraft {
  const parsed = Number.parseInt(draft.gate.replace(/[^0-9]/g, ""), 10);
  return {
    keys: draft.keys
      .split(",")
      .map((key) => key.trim())
      .filter((key) => key.length > 0),
    content: draft.content.trim(),
    requiredAffinity: Number.isNaN(parsed) ? 0 : parsed,
  };
}

function isComplete(draft: Draft): boolean {
  const payload = toPayload(draft);
  return payload.keys.length > 0 && payload.content.length > 0;
}

export interface LoreSectionProps {
  characterId: string;
  entries: LoreView[];
  serverHost: string;
  onSave: (entryId: string | null, draft: LoreDraft) => void;
  onDelete: (entryId: string) => void;
}

export function LoreSection({
  characterId,
  entries,
  serverHost,
  onSave,
  onDelete,
}: LoreSectionProps) {
  const theme = useResolvedTheme(characterId);
  const say = useVoice();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Draft>(EMPTY);

  const beginEdit = (entry: LoreView) => {
    setEditingId(entry.id);
    setDraft({
      keys: entry.keys.join(", "),
      content: entry.content ?? "",
      gate: String(entry.requiredAffinity),
    });
  };

  const beginAdd = () => {
    setEditingId(NEW_ENTRY);
    setDraft(EMPTY);
  };

  const cancel = () => {
    setEditingId(null);
    setDraft(EMPTY);
  };

  const author = useTextAuthor(serverHost, "lore");

  const commit = () => {
    if (!isComplete(draft)) return;
    onSave(editingId === NEW_ENTRY ? null : editingId, toPayload(draft));
    cancel();
  };

  const field = (
    value: string,
    onChangeText: (next: string) => void,
    placeholder: string,
    multiline = false,
  ) => (
    <TextInput
      accessibilityLabel={placeholder}
      multiline={multiline}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={theme.textMuted}
      cursorColor={theme.primary}
      selectionColor={theme.primary}
      className="rounded-button border border-border px-2.5 py-2 font-main text-sm text-text-primary"
      style={
        multiline
          ? { minHeight: 64, textAlignVertical: "top", includeFontPadding: false }
          : { includeFontPadding: false }
      }
    />
  );

  const editor = (
    <View className="gap-2">
      {field(
        draft.keys,
        (keys) => setDraft((d) => ({ ...d, keys })),
        MIND_COPY.loreKeysPlaceholder,
      )}
      {field(
        draft.content,
        (content) => setDraft((d) => ({ ...d, content })),
        say(MIND_COPY.loreContentPlaceholder),
        true,
      )}
      <View className="flex-row items-center gap-2">
        <Text className="flex-1 font-ui text-[11px] text-text-muted">
          {MIND_COPY.loreGateLabel}
        </Text>
        <View style={{ width: 72 }}>
          {field(draft.gate, (gate) => setDraft((d) => ({ ...d, gate })), "0")}
        </View>
      </View>
      <AuthorButtons
        characterId={characterId}
        author={author}
        draft={draft.content}
        onText={(content) => setDraft((d) => ({ ...d, content }))}
      />
    </View>
  );

  return (
    <View className="gap-3">
      <Text className="font-ui-bold text-text-muted text-xs uppercase tracking-[1.5px]">
        {MIND_COPY.loreHeading}
      </Text>

      {entries.length === 0 && editingId !== NEW_ENTRY ? (
        <Text className="font-ui text-text-muted text-xs">{MIND_COPY.loreEmpty}</Text>
      ) : null}

      {editingId === null ? (
        <AddRowButton characterId={characterId} label={MIND_COPY.loreAdd} onPress={beginAdd} />
      ) : null}

      <View className="gap-2">
        {editingId === NEW_ENTRY ? (
          <View className="gap-2 rounded-card border border-border bg-input px-3 py-3">
            <View className="flex-row items-center justify-between">
              <Text
                className="font-ui-bold text-[11px] uppercase tracking-[1.2px]"
                style={{ color: theme.primary }}
              >
                {MIND_COPY.loreAdd}
              </Text>
              <RowActions
                characterId={characterId}
                isEditing
                canSave={isComplete(draft)}
                onEdit={beginAdd}
                onSave={commit}
                onCancel={cancel}
                onDelete={cancel}
              />
            </View>
            {editor}
          </View>
        ) : null}

        {entries.map((entry) => {
          const isEditing = editingId === entry.id;

          return (
            <View
              key={entry.id}
              className="gap-1.5 rounded-card border border-border bg-input px-3 py-3"
            >
              <View className="flex-row items-center justify-between gap-2">
                {entry.isUnlocked || isEditing ? (
                  <Text className="flex-1 font-ui text-[11px] text-text-muted" numberOfLines={1}>
                    {`${MIND_COPY.loreKeysLabel} ${entry.keys.join(", ")}`}
                  </Text>
                ) : (
                  <View className="flex-1 flex-row items-center gap-2">
                    <AppIcon icon={SquareLock01Icon} size={14} color={theme.textMuted} />
                    <Text className="flex-1 font-ui text-[11px] text-text-muted" numberOfLines={1}>
                      {`${MIND_COPY.loreLockedPrefix} · ${entry.requiredTier} ${MIND_COPY.loreLockedSuffix}`}
                    </Text>
                  </View>
                )}
                <RowActions
                  characterId={characterId}
                  isEditing={isEditing}
                  canSave={isComplete(draft)}
                  onEdit={() => beginEdit(entry)}
                  onSave={commit}
                  onCancel={cancel}
                  onDelete={() => onDelete(entry.id)}
                />
              </View>

              {isEditing ? (
                editor
              ) : entry.isUnlocked ? (
                <Text className="font-main text-sm text-text-primary">{entry.content}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
