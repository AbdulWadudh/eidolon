import { PERSONA_COPY, UI_MS } from "@eidolon/config";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as React from "react";
import { ActivityIndicator, Modal, Text, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Cancel01Icon, Delete02Icon, FileUploadIcon, SparklesIcon, UserIcon } from "@/lib/icons";
import { tap } from "@/services/haptics";
import {
  fetchPersona,
  type Persona,
  removePhoto,
  requestPersonaPortrait,
  uploadPhoto,
} from "@/store/persona-api";
import { useResolvedTheme } from "@/store/theme-store";
import { useToastStore } from "@/store/toast-store";

const PHOTO_PX = 72;
const POLL_MS = 3000;

export interface PersonaPhotoProps {
  serverHost: string;
  persona: Persona;
  onChanged: (persona: Persona) => void;
}

export function PersonaPhoto({ serverHost, persona, onChanged }: PersonaPhotoProps) {
  const theme = useResolvedTheme();
  const [isBusy, setBusy] = React.useState(false);
  const [isDrawing, setDrawing] = React.useState(false);
  const [isOpen, setOpen] = React.useState(false);
  const reduced = useReducedMotion();
  const startedWith = React.useRef(persona.photoUrl);

  React.useEffect(() => {
    if (!isDrawing) return;

    const timer = setInterval(() => {
      void fetchPersona(serverHost, persona.id).then((next) => {
        if (!next?.photoUrl || next.photoUrl === startedWith.current) return;
        setDrawing(false);
        tap("success");
        onChanged(next);
      });
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [isDrawing, serverHost, persona.id, onChanged]);

  const draw = React.useCallback(async () => {
    startedWith.current = persona.photoUrl;
    setDrawing(true);
    useToastStore.getState().notify(PERSONA_COPY.photoQueued, "neutral");

    const failed = await requestPersonaPortrait(serverHost, persona.id, "");
    if (!failed) return;

    setDrawing(false);
    useToastStore.getState().notify(failed, "bad");
  }, [serverHost, persona.id, persona.photoUrl]);

  const pick = React.useCallback(async () => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["image/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });

    const asset = picked.canceled ? null : picked.assets[0];
    if (!asset) return;

    setBusy(true);
    const result = await uploadPhoto(serverHost, persona.id, {
      uri: asset.uri,
      name: asset.name || "photo.png",
      type: asset.mimeType || "image/png",
    });
    setBusy(false);

    if (!result.ok) {
      tap("light");
      useToastStore.getState().notify(result.error, "bad");
      return;
    }

    tap("success");
    onChanged(result.persona);
  }, [serverHost, persona.id, onChanged]);

  const clear = React.useCallback(async () => {
    setBusy(true);
    const next = await removePhoto(serverHost, persona.id);
    setBusy(false);
    if (next) {
      tap("light");
      onChanged(next);
    }
  }, [serverHost, persona.id, onChanged]);

  return (
    <>
      <View className="flex-row items-center gap-3.5">
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={PERSONA_COPY.photoOpen}
          onPress={() => {
            tap("light");
            setOpen(true);
          }}
        >
          <Avatar size={PHOTO_PX} className="overflow-hidden border border-border">
            {isBusy || isDrawing ? (
              <AvatarFallback>
                <ActivityIndicator size="small" color={theme.primary} />
              </AvatarFallback>
            ) : persona.photoUrl ? (
              <Image
                source={{ uri: persona.photoUrl }}
                contentFit="cover"
                contentPosition="top"
                cachePolicy="disk"
                accessibilityLabel={PERSONA_COPY.photoLabel}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <AvatarFallback>
                <AppIcon icon={UserIcon} size={26} color={theme.textMuted} />
              </AvatarFallback>
            )}
          </Avatar>
        </PressableScale>

        <View className="flex-1 gap-2">
          <Text className="font-ui text-[10.5px] text-text-muted leading-[14px]">
            {isDrawing ? PERSONA_COPY.photoQueued : PERSONA_COPY.photoGenerateHint}
          </Text>

          <View className="flex-row">
            <Button
              variant="default"
              size="sm"
              className="flex-row gap-1.5"
              disabled={isBusy || isDrawing}
              onPress={() => void draw()}
            >
              <AppIcon icon={SparklesIcon} size={13} color={theme.primaryForeground} />
              <Text className="font-ui-bold text-[11px] text-primary-foreground">
                {PERSONA_COPY.photoGenerate}
              </Text>
            </Button>
          </View>
        </View>
      </View>

      <Modal
        visible={isOpen}
        transparent
        animationType="none"
        onRequestClose={() => setOpen(false)}
      >
        <Animated.View
          entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
          className="flex-1"
          style={{ backgroundColor: "rgba(0,0,0,0.94)" }}
        >
          <View className="flex-row justify-end px-4 pt-14">
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={PERSONA_COPY.photoClose}
              hitSlop={12}
              onPress={() => setOpen(false)}
              className="h-11 w-11 items-center justify-center"
            >
              <AppIcon icon={Cancel01Icon} size={22} color="#fff" strokeWidth={2} />
            </PressableScale>
          </View>

          <View className="flex-1 items-center justify-center px-8">
            {persona.photoUrl ? (
              <Image
                source={{ uri: persona.photoUrl }}
                contentFit="contain"
                cachePolicy="disk"
                accessibilityLabel={PERSONA_COPY.photoLabel}
                style={{ width: "100%", height: "70%" }}
              />
            ) : (
              <View className="items-center gap-3">
                <View
                  className="h-24 w-24 items-center justify-center rounded-full border border-border"
                  style={{ backgroundColor: theme.inputSurface }}
                >
                  <AppIcon icon={UserIcon} size={40} color={theme.textMuted} />
                </View>
                <Text className="text-center font-main text-[13px] text-text-muted leading-5">
                  {PERSONA_COPY.photoEmpty}
                </Text>
              </View>
            )}
          </View>

          <View className="flex-row flex-wrap justify-center gap-2 px-4 pb-12">
            <Button
              variant="secondary"
              size="sm"
              className="flex-row gap-1.5"
              disabled={isBusy || isDrawing}
              onPress={() => void pick()}
            >
              <AppIcon icon={FileUploadIcon} size={13} color={theme.textPrimary} />
              <Text className="font-ui-medium text-[11px] text-text-primary">
                {PERSONA_COPY.photoChange}
              </Text>
            </Button>

            {persona.photoUrl ? (
              <Button
                variant="destructive"
                size="sm"
                className="flex-row gap-1.5"
                disabled={isBusy || isDrawing}
                onPress={() => void clear()}
              >
                <AppIcon icon={Delete02Icon} size={13} color={theme.textPrimary} />
                <Text className="font-ui-medium text-[11px] text-text-primary">
                  {PERSONA_COPY.photoRemove}
                </Text>
              </Button>
            ) : null}
          </View>
        </Animated.View>
      </Modal>
    </>
  );
}
