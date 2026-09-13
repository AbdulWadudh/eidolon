import { PERSONA_COPY, UI_MS } from "@eidolon/config";
import { Image } from "expo-image";
import { useFocusEffect, useRouter } from "expo-router";
import * as React from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useConfirm } from "@/hooks/use-confirm";
import { useBarTopInset } from "@/lib/bar-inset";
import { AddCircleIcon, ArrowLeft01Icon, Delete02Icon, UserIcon } from "@/lib/icons";
import { tap } from "@/services/haptics";
import { useConnectionStore } from "@/store/connection";
import {
  createPersona,
  fetchPersonas,
  makeDefault,
  type Persona,
  removePersona,
} from "@/store/persona-api";
import { useResolvedTheme } from "@/store/theme-store";
import { useToastStore } from "@/store/toast-store";

const AVATAR_PX = 44;

export default function PersonasScreen() {
  const router = useRouter();
  const theme = useResolvedTheme();
  const reduced = useReducedMotion();
  const barTop = useBarTopInset();
  const confirmation = useConfirm();
  const serverHost = useConnectionStore((state) => state.serverHost);

  const [personas, setPersonas] = React.useState<Persona[]>([]);
  const [isLoading, setLoading] = React.useState(true);
  const [isBusy, setBusy] = React.useState(false);

  useFocusEffect(
    React.useCallback(() => {
      let live = true;
      setLoading(true);

      void fetchPersonas(serverHost).then((found) => {
        if (!live) return;
        setPersonas(found);
        setLoading(false);
      });

      return () => {
        live = false;
      };
    }, [serverHost]),
  );

  const create = React.useCallback(async () => {
    setBusy(true);
    const made = await createPersona(serverHost, { name: PERSONA_COPY.unnamed });
    setBusy(false);

    if (!made) {
      useToastStore.getState().notify(PERSONA_COPY.needName, "bad");
      return;
    }

    tap("success");
    router.push(`/personas/${made.id}`);
  }, [serverHost, router]);

  const use = React.useCallback(
    async (persona: Persona) => {
      if (persona.isDefault) return;
      tap("light");

      const next = await makeDefault(serverHost, persona.id);
      if (next) setPersonas(next);
    },
    [serverHost],
  );

  const remove = React.useCallback(
    (persona: Persona) => {
      confirmation.ask({
        title: `${PERSONA_COPY.remove} ${persona.name}?`,
        body: PERSONA_COPY.removeBody,
        confirmLabel: PERSONA_COPY.removeAction,
        onConfirm: () => {
          void removePersona(serverHost, persona.id).then((next) => {
            if (next) setPersonas(next);
          });
        },
      });
    },
    [confirmation, serverHost],
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-canvas">
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

        <View className="flex-1">
          <Text className="font-main-bold text-base text-text-primary">{PERSONA_COPY.title}</Text>
          <Text className="font-ui text-[11px] text-text-muted">{PERSONA_COPY.blurb}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: 40, gap: 10 }}>
        {isLoading && personas.length === 0 ? (
          <View className="items-center gap-3 py-16">
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : personas.length === 0 ? (
          <Card className="border-border border-dashed p-6">
            <Text className="text-center font-main text-sm text-text-muted leading-5">
              {PERSONA_COPY.empty}
            </Text>
          </Card>
        ) : (
          personas.map((persona, position) => (
            <Animated.View
              key={persona.id}
              entering={
                reduced
                  ? undefined
                  : FadeInDown.duration(UI_MS.disclosure).delay(position * UI_MS.revealStagger)
              }
            >
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`Edit ${persona.name}`}
                onPress={() => router.push(`/personas/${persona.id}`)}
                className="overflow-hidden rounded-card border p-3"
                style={{
                  borderColor: persona.isDefault ? theme.primary : theme.cardBorder,
                  backgroundColor: theme.card,
                }}
              >
                <View className="flex-row items-center gap-3">
                  <Avatar size={AVATAR_PX} className="overflow-hidden border border-border">
                    {persona.photoUrl ? (
                      <Image
                        source={{ uri: persona.photoUrl }}
                        contentFit="cover"
                        contentPosition="top"
                        cachePolicy="disk"
                        style={{ width: "100%", height: "100%" }}
                      />
                    ) : (
                      <AvatarFallback>
                        <AppIcon icon={UserIcon} size={18} color={theme.textMuted} />
                      </AvatarFallback>
                    )}
                  </Avatar>

                  <View className="flex-1">
                    <Text
                      className="font-main-bold text-[15px] text-text-primary"
                      numberOfLines={1}
                    >
                      {persona.name}
                    </Text>
                    <Text className="mt-0.5 font-ui text-[11px] text-text-muted" numberOfLines={1}>
                      {persona.isDefault
                        ? PERSONA_COPY.isDefault
                        : (persona.bio?.trim() ?? "") || PERSONA_COPY.blurb}
                    </Text>
                  </View>

                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`${PERSONA_COPY.remove} ${persona.name}`}
                    hitSlop={10}
                    onPress={() => remove(persona)}
                    className="h-9 w-9 items-center justify-center rounded-full active:bg-input"
                  >
                    <AppIcon icon={Delete02Icon} size={16} color={theme.danger} strokeWidth={1.6} />
                  </PressableScale>
                </View>

                {persona.isDefault ? null : (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-3"
                    onPress={() => void use(persona)}
                  >
                    {PERSONA_COPY.makeDefault}
                  </Button>
                )}
              </PressableScale>
            </Animated.View>
          ))
        )}

        <Button
          variant="default"
          className="mt-2 flex-row gap-2"
          disabled={isBusy}
          onPress={() => void create()}
        >
          <AppIcon icon={AddCircleIcon} size={15} color={theme.primaryForeground} />
          <Text className="font-ui-bold text-primary-foreground text-sm">
            {PERSONA_COPY.create}
          </Text>
        </Button>

        <Text className="mt-1 text-center font-ui text-[11px] text-text-muted">
          {PERSONA_COPY.defaultHint}
        </Text>
      </ScrollView>

      {confirmation.sheet}
    </SafeAreaView>
  );
}
