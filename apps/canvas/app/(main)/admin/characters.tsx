import { AUTHOR_FIELDS, CONFIRM_COPY, DASHBOARD_COPY } from "@eidolon/config";
import * as React from "react";
import { View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import { AdminCharacterEditor } from "@/components/admin/AdminCharacterEditor";
import { AdminEmpty, AdminScreen } from "@/components/admin/AdminScreen";
import { revealAt } from "@/components/admin/admin-motion";
import { EditableRow, useSaveState } from "@/components/admin/EditableRow";
import { type Draft, EMPTY_DRAFT } from "@/components/characters/CharacterForm";
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

function avatarUrl(character: AdminCharacter): string | null {
  const value = (character as { avatarUrl?: string | null }).avatarUrl;
  return typeof value === "string" && value.length > 0 ? value : null;
}

function draftFrom(character: AdminCharacter): Draft {
  return {
    name: character.name,
    tagline: character.tagline,
    personality: character.personality,
    systemPrompt: character.systemPrompt,
    scenario: character.scenario,
    rules: character.rules,
    exampleDialogue: character.exampleDialogue,
    greeting: character.greeting,
    voice: character.voice,
    pronouns: character.pronouns,
  };
}

export default function AdminCharactersScreen() {
  const reduced = useReducedMotion();
  const { serverHost, pairingToken } = useConnectionStore();

  const [characters, setCharacters] = React.useState<AdminCharacter[]>([]);
  const [isLoading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
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
      setDraft(draftFrom(character));
    },
    [openId],
  );

  const change = React.useCallback((patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const commit = React.useCallback(
    (character: AdminCharacter) => {
      setError(null);
      void runSave(() =>
        saveCharacter(serverHost, pairingToken, character.id, draft).then(() => reload()),
      ).catch(report);
    },
    [draft, pairingToken, reload, report, runSave, serverHost],
  );

  const publish = React.useCallback(
    (character: AdminCharacter, isPublic: boolean) => {
      setError(null);
      saveCharacter(serverHost, pairingToken, character.id, { isPublic })
        .then(() => reload())
        .catch(report);
    },
    [pairingToken, reload, report, serverHost],
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
              removeTitle={CONFIRM_COPY.deleteCharacter}
              removeBody={CONFIRM_COPY.deleteCharacterBody}
              saveState={saveState}
            >
              {openId === character.id ? (
                <AdminCharacterEditor
                  character={character}
                  draft={draft}
                  serverHost={serverHost}
                  avatarUrl={avatarUrl(character)}
                  onChange={change}
                  onPublish={(next) => publish(character, next)}
                  onPortrait={() => void reload()}
                />
              ) : null}
            </EditableRow>
          </Animated.View>
        ))
      )}
    </AdminScreen>
  );
}
