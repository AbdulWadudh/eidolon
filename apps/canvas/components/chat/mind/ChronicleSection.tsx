import { CHRONICLE_PAGING, MIND_COPY } from "@eidolon/config";
import * as React from "react";
import { Text, TextInput, View } from "react-native";
import { AddRowButton, RowActions } from "@/components/chat/mind/RowActions";
import { AuthorActions, textAuthorActions } from "@/components/common/authored-field";
import { useTextAuthor } from "@/hooks/use-text-author";
import type { ChapterView } from "@/store/mind-api";
import { useResolvedTheme } from "@/store/theme-store";

const NEW_CHAPTER = "new";

export interface ChronicleSectionProps {
  characterId: string;
  chapters: ChapterView[];
  serverHost: string;
  onSave: (chapterId: string | null, summaryText: string) => void;
  onDelete: (chapterId: string) => void;
}

export function ChronicleSection({
  characterId,
  chapters,
  serverHost,
  onSave,
  onDelete,
}: ChronicleSectionProps) {
  const theme = useResolvedTheme(characterId);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [shown, setShown] = React.useState(CHRONICLE_PAGING.steps[0] ?? 5);
  const author = useTextAuthor(serverHost, "chapter", { characterId });

  const visible = chapters.slice(0, shown);
  const nextStep = CHRONICLE_PAGING.steps.find((step) => step > shown);
  const remaining = chapters.length - visible.length;

  const loadMore = () => {
    setShown(nextStep ?? chapters.length);
  };

  const beginEdit = (chapter: ChapterView) => {
    setEditingId(chapter.id);
    setDraft(chapter.bullets.join("\n"));
  };

  const beginAdd = () => {
    setEditingId(NEW_CHAPTER);
    setDraft("");
  };

  const cancel = () => {
    setEditingId(null);
    setDraft("");
  };

  const commit = () => {
    const text = draft.trim();
    if (text.length === 0) return;
    onSave(editingId === NEW_CHAPTER ? null : editingId, text);
    cancel();
  };

  const editor = (
    <TextInput
      accessibilityLabel={MIND_COPY.chapterPlaceholder}
      multiline
      value={draft}
      onChangeText={setDraft}
      placeholder={MIND_COPY.chapterPlaceholder}
      placeholderTextColor={theme.textMuted}
      cursorColor={theme.primary}
      selectionColor={theme.primary}
      className="font-main text-sm text-text-primary"
      style={{ minHeight: 72, textAlignVertical: "top", includeFontPadding: false }}
    />
  );

  const assist = (
    <AuthorActions characterId={characterId} {...textAuthorActions(author, draft, setDraft)} />
  );

  return (
    <View className="gap-3">
      <Text className="font-ui-bold text-text-muted text-xs uppercase tracking-[1.5px]">
        {MIND_COPY.chronicleHeading}
      </Text>

      {chapters.length === 0 && editingId !== NEW_CHAPTER ? (
        <Text className="font-ui text-text-muted text-xs">{MIND_COPY.chronicleEmpty}</Text>
      ) : null}

      {editingId === null ? (
        <AddRowButton characterId={characterId} label={MIND_COPY.chapterAdd} onPress={beginAdd} />
      ) : null}

      {remaining > 0 ? (
        <AddRowButton
          characterId={characterId}
          label={MIND_COPY.chapterMore(Math.min(remaining, (nextStep ?? chapters.length) - shown))}
          onPress={loadMore}
        />
      ) : null}

      <View className="gap-2">
        {editingId === NEW_CHAPTER ? (
          <View className="gap-2 rounded-card border border-border bg-input px-3 py-3">
            <View className="flex-row items-center justify-between">
              <Text
                className="font-ui-bold text-[11px] uppercase tracking-[1.2px]"
                style={{ color: theme.primary }}
              >
                {MIND_COPY.chapterAdd}
              </Text>
              <RowActions
                characterId={characterId}
                isEditing
                canSave={draft.trim().length > 0}
                onEdit={beginAdd}
                onSave={commit}
                onCancel={cancel}
                onDelete={cancel}
              />
            </View>
            {editor}
            {assist}
          </View>
        ) : null}

        {visible.map((chapter) => {
          const isEditing = editingId === chapter.id;

          return (
            <View
              key={chapter.id}
              className="gap-2 rounded-card border border-border bg-input px-3 py-3"
            >
              <View className="flex-row items-center justify-between">
                <Text
                  className="font-ui-bold text-[11px] uppercase tracking-[1.2px]"
                  style={{ color: theme.primary }}
                >
                  {`${MIND_COPY.chapterLabel} ${chapter.chapterIndex}`}
                </Text>
                <RowActions
                  characterId={characterId}
                  isEditing={isEditing}
                  canSave={draft.trim().length > 0}
                  onEdit={() => beginEdit(chapter)}
                  onSave={commit}
                  onCancel={cancel}
                  onDelete={() => onDelete(chapter.id)}
                />
              </View>

              {isEditing ? (
                <>
                  {editor}
                  {assist}
                </>
              ) : (
                chapter.bullets.map((bullet) => (
                  <View key={`${chapter.id}-${bullet}`} className="flex-row gap-2">
                    <Text className="font-ui text-sm" style={{ color: theme.primary }}>
                      ·
                    </Text>
                    <Text className="flex-1 font-main text-sm text-text-primary">{bullet}</Text>
                  </View>
                ))
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
