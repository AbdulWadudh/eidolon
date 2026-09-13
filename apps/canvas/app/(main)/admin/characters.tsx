import { AUTHOR_FIELDS, DASHBOARD_COPY } from "@eidolon/config";
import * as React from "react";
import { Text, TextInput, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { AdminEmpty, AdminScreen } from "@/components/admin/AdminScreen";
import { revealAt } from "@/components/admin/admin-motion";
import { EditableRow, useSaveState } from "@/components/admin/EditableRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  type AdminCharacter,
  AdminRequestError,
  createCharacter,
  fetchAdminCharacters,
  removeCharacter,
  saveCharacter,
} from "@/store/admin-api";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";

const FIELDS = ["tagline", "personality", "scenario", "rules", "greeting"] as const;

type Field = (typeof FIELDS)[number];

type Draft = Partial<Record<Field | "name", string>>;

export default function AdminCharactersScreen() {
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();
  const { serverHost, pairingToken } = useConnectionStore();

  const [characters, setCharacters] = React.useState<AdminCharacter[]>([]);
  const [isLoading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Draft>({});
  const [newName, setNewName] = React.useState("");
  const [saveState, runSave] = useSaveState();

  const reload = React.useCallback(
    () =>
      fetchAdminCharacters(serverHost, pairingToken)
        .then((body) => {
          setCharacters(body.characters);
          setLoading(false);
        })
        .catch(() => {
          setError(DASHBOARD_COPY.failed);
          setLoading(false);
        }),
    [pairingToken, serverHost],
  );

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const report = React.useCallback((cause: unknown) => {
    const message = cause instanceof AdminRequestError ? cause.message : "";
    setError(message.length > 0 ? message : DASHBOARD_COPY.failed);
  }, []);

  const open = React.useCallback(
    (character: AdminCharacter) => {
      if (openId === character.id) {
        setOpenId(null);
        return;
      }
      setOpenId(character.id);
      setDraft({
        name: character.name,
        tagline: character.tagline,
        personality: character.personality,
        scenario: character.scenario,
        rules: character.rules,
        greeting: character.greeting,
      });
    },
    [openId],
  );

  const commit = React.useCallback(
    (character: AdminCharacter) => {
      setError(null);
      void runSave(() =>
        saveCharacter(serverHost, pairingToken, character.id, draft).then(() => reload()),
      ).catch(report);
    },
    [draft, pairingToken, reload, report, runSave, serverHost],
  );

  const remove = React.useCallback(
    (character: AdminCharacter) => {
      setError(null);
      removeCharacter(serverHost, pairingToken, character.id)
        .then(() => {
          setOpenId(null);
          return reload();
        })
        .catch(report);
    },
    [pairingToken, reload, report, serverHost],
  );

  const add = React.useCallback(() => {
    if (newName.trim().length === 0) return;
    setError(null);
    createCharacter(serverHost, pairingToken, newName.trim())
      .then(() => {
        setNewName("");
        return reload();
      })
      .catch(report);
  }, [newName, pairingToken, reload, report, serverHost]);

  return (
    <AdminScreen
      title={DASHBOARD_COPY.charactersTitle}
      blurb={DASHBOARD_COPY.charactersBlurb}
      isLoading={isLoading}
      error={error}
    >
      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Input
            placeholder={AUTHOR_FIELDS.name.label}
            value={newName}
            onChangeText={setNewName}
            autoCapitalize="words"
          />
        </View>
        <Button variant="secondary" size="default" disabled={!newName.trim()} onPress={add}>
          {DASHBOARD_COPY.create}
        </Button>
      </View>

      {characters.length === 0 ? (
        <AdminEmpty />
      ) : (
        characters.map((character, index) => (
          <Animated.View entering={revealAt(index, reduced)} key={character.id}>
            <EditableRow
              title={character.name}
              subtitle={character.tagline || character.id}
              badge={character.isPublic ? "Public" : null}
              expanded={openId === character.id}
              onToggle={() => open(character)}
              onSave={() => commit(character)}
              onRemove={() => remove(character)}
              saveState={saveState}
            >
              <View className="gap-1.5">
                <Text className="font-ui text-[11px] text-text-muted">
                  {AUTHOR_FIELDS.name.label}
                </Text>
                <Input
                  value={draft.name ?? ""}
                  onChangeText={(value) => setDraft((prev) => ({ ...prev, name: value }))}
                  autoCapitalize="words"
                />
              </View>

              {FIELDS.map((field) => (
                <View className="gap-1.5" key={field}>
                  <Text className="font-ui text-[11px] text-text-muted">
                    {AUTHOR_FIELDS[field].label}
                  </Text>
                  <TextInput
                    multiline={!AUTHOR_FIELDS[field].singleLine}
                    value={draft[field] ?? ""}
                    onChangeText={(value) => setDraft((prev) => ({ ...prev, [field]: value }))}
                    placeholderTextColor={theme.textMuted}
                    cursorColor={theme.primary}
                    selectionColor={theme.primary}
                    style={{
                      minHeight: AUTHOR_FIELDS[field].singleLine ? undefined : 96,
                      textAlignVertical: AUTHOR_FIELDS[field].singleLine ? "center" : "top",
                    }}
                    className="rounded-input border border-border bg-input-surface p-3 font-ui text-xs text-text-primary leading-5"
                  />
                </View>
              ))}
            </EditableRow>
          </Animated.View>
        ))
      )}
    </AdminScreen>
  );
}
