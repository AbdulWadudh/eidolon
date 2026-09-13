import { PERSONA_COPY, UI_MS } from "@eidolon/config";
import { isString } from "es-toolkit";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { AuthoredFields } from "@/components/characters/CharacterFields";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { ChapterList } from "@/components/personas/ChapterList";
import { PersonaPhoto } from "@/components/personas/PersonaPhoto";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";
import { useFieldAuthor } from "@/hooks/use-field-author";
import { useGlobalThemeScope } from "@/hooks/use-global-theme-scope";
import { useBarTopInset } from "@/lib/bar-inset";
import { ArrowLeft01Icon } from "@/lib/icons";
import { tap } from "@/services/haptics";
import { useConnectionStore } from "@/store/connection";
import {
  addChapter,
  fetchPersonas,
  type Persona,
  type PersonaChapter,
  removeChapter,
  saveChapter,
  savePersona,
} from "@/store/persona-api";
import {
  draftFrom,
  EMPTY_PERSONA,
  isDirty,
  PERSONA_FIELD_ORDER,
  PERSONA_FIELDS,
  type PersonaFormDraft,
  toPatch,
} from "@/store/persona-draft";
import { useResolvedTheme } from "@/store/theme-store";
import { useToastStore } from "@/store/toast-store";

export default function PersonaEditorScreen() {
  useGlobalThemeScope();
  const router = useRouter();
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();
  const barTop = useBarTopInset();
  const confirmation = useConfirm();
  const serverHost = useConnectionStore((state) => state.serverHost);

  const { id } = useLocalSearchParams<{ id: string }>();
  const personaId = isString(id) ? id : "";

  const [persona, setPersona] = React.useState<Persona | null>(null);
  const [draft, setDraft] = React.useState<PersonaFormDraft>(EMPTY_PERSONA);
  const [isLoading, setLoading] = React.useState(true);
  const [isSaving, setSaving] = React.useState(false);

  React.useEffect(() => {
    let live = true;

    void fetchPersonas(serverHost).then((all) => {
      if (!live) return;
      const found = all.find((entry) => entry.id === personaId) ?? null;
      setPersona(found);
      setDraft(found ? draftFrom(found) : EMPTY_PERSONA);
      setLoading(false);
    });

    return () => {
      live = false;
    };
  }, [serverHost, personaId]);

  const change = React.useCallback((patch: Partial<PersonaFormDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const author = useFieldAuthor(serverHost, draft, change, { personaId });

  const save = React.useCallback(async () => {
    if (draft.personaName.trim().length === 0) {
      useToastStore.getState().notify(PERSONA_COPY.needName, "bad");
      return;
    }

    setSaving(true);
    const next = await savePersona(serverHost, personaId, toPatch(draft));
    setSaving(false);

    if (!next) {
      useToastStore.getState().notify(PERSONA_COPY.needName, "bad");
      return;
    }

    tap("success");
    setPersona(next);
    useToastStore.getState().notify(PERSONA_COPY.saved, "good");
  }, [serverHost, personaId, draft]);

  const removeOne = React.useCallback(
    (chapter: PersonaChapter) => {
      confirmation.ask({
        title: PERSONA_COPY.chapterRemove,
        body: PERSONA_COPY.chapterRemoveBody,
        confirmLabel: PERSONA_COPY.removeAction,
        onConfirm: () => {
          void removeChapter(serverHost, personaId, chapter.id).then((next) => {
            if (next) setPersona(next);
          });
        },
      });
    },
    [confirmation, serverHost, personaId],
  );

  const dirty = isDirty(draft, persona);

  return (
    <SafeAreaView
      edges={["top"]}
      className="flex-1 bg-canvas"
      style={{ flex: 1, backgroundColor: theme.canvas }}
    >
      <View className="flex-row items-center gap-2 px-3 pb-2" style={{ paddingTop: barTop + 6 }}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
          onPress={() => router.back()}
          className="h-9 w-9 items-center justify-center rounded-full active:bg-input"
        >
          <AppIcon icon={ArrowLeft01Icon} size={18} color={theme.textPrimary} strokeWidth={1.8} />
        </PressableScale>

        <Text className="flex-1 font-main-bold text-base text-text-primary" numberOfLines={1}>
          {persona?.name || PERSONA_COPY.createTitle}
        </Text>

        {dirty ? (
          <Animated.View entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}>
            <Button variant="default" size="sm" disabled={isSaving} onPress={() => void save()}>
              {isSaving ? (
                <ActivityIndicator size="small" color={theme.primaryForeground} />
              ) : (
                "Save"
              )}
            </Button>
          </Animated.View>
        ) : null}
      </View>

      <KeyboardAvoidingView behavior="padding" automaticOffset style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{ padding: 14, paddingBottom: 48, gap: 18 }}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading ? (
            <View className="items-center py-20">
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : !persona ? (
            <Text className="py-20 text-center font-main text-sm text-text-muted">
              {PERSONA_COPY.empty}
            </Text>
          ) : (
            <>
              <PersonaPhoto
                serverHost={serverHost}
                persona={persona}
                onChanged={(next) => setPersona(next)}
              />

              <AuthoredFields
                keys={PERSONA_FIELD_ORDER}
                fields={PERSONA_FIELDS}
                draft={draft}
                author={author}
                onChange={change}
              />

              <View className="h-px bg-border" />

              <ChapterList
                serverHost={serverHost}
                personaId={personaId}
                chapters={persona.chapters}
                onAdd={(chapter) => {
                  void addChapter(serverHost, personaId, chapter).then((next) => {
                    if (next) setPersona(next);
                  });
                }}
                onSave={(chapterId, patch) => {
                  void saveChapter(serverHost, personaId, chapterId, patch).then((next) => {
                    if (next) setPersona(next);
                  });
                }}
                onRemove={removeOne}
              />
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {confirmation.sheet}
    </SafeAreaView>
  );
}
