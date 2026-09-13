import type { PromptCategory } from "@eidolon/config";
import {
  AUTHOR_COPY,
  CONFIRM_COPY,
  DASHBOARD_COPY,
  PROMPT_CATEGORIES,
  PROMPT_CATEGORY_COPY,
} from "@eidolon/config";
import * as React from "react";
import { Text, TextInput, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { AdminEmpty, AdminScreen } from "@/components/admin/AdminScreen";
import { revealAt } from "@/components/admin/admin-motion";
import { EditableRow, useSaveState } from "@/components/admin/EditableRow";
import { FieldAuthorRow } from "@/components/characters/FieldAuthorRow";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { Input } from "@/components/ui/input";
import { usePromptAuthor } from "@/hooks/use-prompt-author";
import { type AdminPrompt, fetchPrompts, resetPrompt, savePrompt } from "@/store/admin-api";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";

const UNSORTED = "other";

export default function AdminPromptsScreen() {
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();
  const { serverHost, pairingToken } = useConnectionStore();

  const [prompts, setPrompts] = React.useState<AdminPrompt[]>([]);
  const [isLoading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [openCategory, setOpenCategory] = React.useState<string | null>(PROMPT_CATEGORIES[0]);
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [saveState, runSave] = useSaveState();

  const author = usePromptAuthor(serverHost, pairingToken, (_key, text) => setDraft(text));

  React.useEffect(() => {
    let live = true;

    fetchPrompts(serverHost, pairingToken)
      .then((body) => {
        if (!live) return;
        setPrompts(body.prompts);
        setLoading(false);
      })
      .catch(() => {
        if (!live) return;
        setError(DASHBOARD_COPY.failed);
        setLoading(false);
      });

    return () => {
      live = false;
    };
  }, [serverHost, pairingToken]);

  const visible = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) return prompts;
    return prompts.filter(
      (prompt) =>
        prompt.key.toLowerCase().includes(needle) ||
        prompt.description.toLowerCase().includes(needle),
    );
  }, [prompts, query]);

  const grouped = React.useMemo(() => {
    const order = [...PROMPT_CATEGORIES, UNSORTED];
    const byCategory = new Map<string, AdminPrompt[]>();

    for (const prompt of visible) {
      const key = prompt.category ?? UNSORTED;
      const bag = byCategory.get(key);
      if (bag) bag.push(prompt);
      else byCategory.set(key, [prompt]);
    }

    return order
      .filter((key) => byCategory.has(key))
      .map((key) => ({ key, prompts: byCategory.get(key) ?? [] }));
  }, [visible]);

  React.useEffect(() => {
    if (query.trim().length > 0 && grouped.length > 0) setOpenCategory(grouped[0]?.key ?? null);
  }, [query, grouped]);

  const replace = React.useCallback((next: AdminPrompt) => {
    setPrompts((current) => current.map((entry) => (entry.key === next.key ? next : entry)));
  }, []);

  const open = React.useCallback(
    (prompt: AdminPrompt) => {
      if (openKey === prompt.key) {
        setOpenKey(null);
        return;
      }
      setOpenKey(prompt.key);
      setDraft(prompt.value);
      author.forget(prompt.key);
    },
    [openKey, author.forget],
  );

  const commit = React.useCallback(
    (prompt: AdminPrompt) => {
      setError(null);
      void runSave(() =>
        savePrompt(serverHost, pairingToken, prompt.key, draft).then((body) =>
          replace(body.prompt),
        ),
      ).catch(() => setError(DASHBOARD_COPY.failed));
    },
    [draft, pairingToken, replace, runSave, serverHost],
  );

  const revert = React.useCallback(
    (prompt: AdminPrompt) => {
      setError(null);
      resetPrompt(serverHost, pairingToken, prompt.key)
        .then((body) => {
          replace(body.prompt);
          setDraft(body.prompt.value);
        })
        .catch(() => setError(DASHBOARD_COPY.failed));
    },
    [pairingToken, replace, serverHost],
  );

  return (
    <AdminScreen
      title={DASHBOARD_COPY.promptsTitle}
      blurb={DASHBOARD_COPY.promptsBlurb}
      isLoading={isLoading}
      error={error}
    >
      <Input
        placeholder={DASHBOARD_COPY.search}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {grouped.length === 0 ? (
        <AdminEmpty />
      ) : (
        grouped.map(({ key, prompts: inCategory }, index) => {
          const copy = PROMPT_CATEGORY_COPY[key as PromptCategory];
          const changed = inCategory.filter((prompt) => prompt.isCustom).length;

          return (
            <Animated.View entering={revealAt(index, reduced)} key={key}>
              <CollapsibleSection
                sectionKey={key}
                title={`${copy?.label ?? key} · ${inCategory.length}`}
                badge={
                  changed > 0 ? (
                    <Text className="font-ui-medium text-[10px] text-primary">
                      {`${changed} ${DASHBOARD_COPY.custom.toLowerCase()}`}
                    </Text>
                  ) : null
                }
                expanded={openCategory === key}
                onToggle={(section) =>
                  setOpenCategory((prev) => (prev === section ? null : section))
                }
                chevronColor={theme.textMuted}
                className="rounded-card border border-border bg-card p-3"
              >
                {copy ? (
                  <Text className="mb-3 font-ui text-[11px] text-text-muted leading-4">
                    {copy.blurb}
                  </Text>
                ) : null}

                <View className="gap-2">
                  {inCategory.map((prompt) => (
                    <EditableRow
                      key={prompt.key}
                      title={prompt.key}
                      subtitle={prompt.description}
                      badge={prompt.isCustom ? DASHBOARD_COPY.custom : null}
                      expanded={openKey === prompt.key}
                      onToggle={() => open(prompt)}
                      onSave={() => commit(prompt)}
                      onReset={prompt.isCustom ? () => revert(prompt) : undefined}
                      resetTitle={CONFIRM_COPY.resetPrompt}
                      resetBody={CONFIRM_COPY.resetPromptBody}
                      saveState={saveState}
                      canSave={draft.trim().length > 0 && draft !== prompt.value}
                    >
                      <View className="flex-row items-center justify-end gap-2">
                        <FieldAuthorRow
                          label={prompt.key}
                          hasText={draft.trim().length > 0}
                          isBusy={author.busyKey === prompt.key}
                          isLocked={author.busyKey !== null && author.busyKey !== prompt.key}
                          stepsBack={author.stepsBack(prompt.key)}
                          onSuggest={() => author.run(prompt.key, "suggest", draft)}
                          onEnhance={() => author.run(prompt.key, "enhance", draft)}
                          onRevert={() => author.revert(prompt.key)}
                        />
                      </View>

                      {author.error !== null && openKey === prompt.key ? (
                        <Text
                          accessibilityLiveRegion="polite"
                          className="font-ui text-[11px] text-danger"
                        >
                          {author.error.length > 0 ? author.error : AUTHOR_COPY.failed}
                        </Text>
                      ) : null}

                      {prompt.variables.length > 0 ? (
                        <View className="flex-row flex-wrap gap-1.5">
                          {prompt.variables.map((variable) => (
                            <View
                              key={variable}
                              className="rounded-full border border-border px-2 py-0.5"
                            >
                              <Text className="font-ui text-[10px] text-text-muted">
                                {`{{${variable}}}`}
                              </Text>
                            </View>
                          ))}
                        </View>
                      ) : null}

                      <TextInput
                        multiline
                        value={draft}
                        onChangeText={setDraft}
                        placeholderTextColor={theme.textMuted}
                        cursorColor={theme.primary}
                        selectionColor={theme.primary}
                        style={{ minHeight: 180, textAlignVertical: "top" }}
                        className="rounded-input border border-border bg-input-surface p-3 font-ui text-xs text-text-primary leading-5"
                      />
                    </EditableRow>
                  ))}
                </View>
              </CollapsibleSection>
            </Animated.View>
          );
        })
      )}
    </AdminScreen>
  );
}
