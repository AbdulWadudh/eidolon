import { DASHBOARD_COPY } from "@eidolon/config";
import * as React from "react";
import { Text, TextInput, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { AdminEmpty, AdminScreen } from "@/components/admin/AdminScreen";
import { revealAt } from "@/components/admin/admin-motion";
import { EditableRow, useSaveState } from "@/components/admin/EditableRow";
import { Input } from "@/components/ui/input";
import { type AdminPrompt, fetchPrompts, resetPrompt, savePrompt } from "@/store/admin-api";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";

export default function AdminPromptsScreen() {
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();
  const { serverHost, pairingToken } = useConnectionStore();

  const [prompts, setPrompts] = React.useState<AdminPrompt[]>([]);
  const [isLoading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [openKey, setOpenKey] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [saveState, runSave] = useSaveState();

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
    },
    [openKey],
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

      {visible.length === 0 ? (
        <AdminEmpty />
      ) : (
        visible.map((prompt, index) => (
          <Animated.View entering={revealAt(index, reduced)} key={prompt.key}>
            <EditableRow
              title={prompt.key}
              subtitle={prompt.description}
              badge={prompt.isCustom ? DASHBOARD_COPY.custom : null}
              expanded={openKey === prompt.key}
              onToggle={() => open(prompt)}
              onSave={() => commit(prompt)}
              onReset={prompt.isCustom ? () => revert(prompt) : undefined}
              saveState={saveState}
              canSave={draft.trim().length > 0 && draft !== prompt.value}
            >
              {prompt.variables.length > 0 ? (
                <View className="flex-row flex-wrap gap-1.5">
                  {prompt.variables.map((variable) => (
                    <View key={variable} className="rounded-full border border-border px-2 py-0.5">
                      <Text className="font-ui text-[10px] text-text-muted">{`{{${variable}}}`}</Text>
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
                style={{ minHeight: 160, textAlignVertical: "top" }}
                className="rounded-input border border-border bg-input-surface p-3 font-ui text-xs text-text-primary leading-5"
              />
            </EditableRow>
          </Animated.View>
        ))
      )}
    </AdminScreen>
  );
}
