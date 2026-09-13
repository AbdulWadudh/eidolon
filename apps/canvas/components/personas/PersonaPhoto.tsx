import { PERSONA_COPY } from "@eidolon/config";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";
import { PhotoViewer } from "@/components/chat/PhotoViewer";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SparklesIcon, UserIcon } from "@/lib/icons";
import { savePhotoToDevice } from "@/lib/save-photo";
import { tap } from "@/services/haptics";
import { useChatStore } from "@/store/chat-store";
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
const GIVE_UP_MS = 180000;

const SAVE_FAILED: Record<string, string> = {
  denied: "Allow photos to save it to your phone.",
  unavailable: "This build cannot reach the photo library.",
  failed: "That picture could not be saved.",
};

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
  const _reduced = useReducedMotion();
  const startedWith = React.useRef(persona.photoUrl);
  const report = React.useRef(onChanged);
  report.current = onChanged;

  const pushed = useChatStore((state) => state.personaUpdate);
  const clearPushed = useChatStore((state) => state.clearPersonaUpdate);

  React.useEffect(() => {
    if (!pushed || pushed.id !== persona.id || !pushed.photoUrl) return;

    clearPushed();
    if (pushed.photoUrl === persona.photoUrl) return;

    setDrawing(false);
    tap("success");
    void fetchPersona(serverHost, persona.id).then((next) => {
      if (next) report.current(next);
    });
  }, [pushed, persona.id, persona.photoUrl, serverHost, clearPushed]);

  React.useEffect(() => {
    if (!isDrawing || !persona.photoUrl || persona.photoUrl === startedWith.current) return;

    setDrawing(false);
  }, [isDrawing, persona.photoUrl]);

  React.useEffect(() => {
    if (!isDrawing) return;

    let waited = 0;
    const timer = setInterval(() => {
      waited += POLL_MS;

      if (waited > GIVE_UP_MS) {
        setDrawing(false);
        useToastStore.getState().notify(PERSONA_COPY.photoFailed, "bad");
        return;
      }

      void fetchPersona(serverHost, persona.id).then((next) => {
        if (!next?.photoUrl || next.photoUrl === startedWith.current) return;
        setDrawing(false);
        tap("success");
        report.current(next);
      });
    }, POLL_MS);

    return () => clearInterval(timer);
  }, [isDrawing, serverHost, persona.id]);

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

      <PhotoViewer
        uri={persona.photoUrl}
        characterId=""
        isOpen={isOpen}
        emptyHint={PERSONA_COPY.photoEmpty}
        actions={persona.photoUrl ? ["change", "save", "delete"] : ["change"]}
        onClose={() => setOpen(false)}
        onCrop={() => undefined}
        onAction={(action) => {
          if (action === "change") {
            setOpen(false);
            void pick();
            return;
          }
          if (action === "save" && persona.photoUrl) {
            void savePhotoToDevice(persona.photoUrl).then((result) => {
              if (result === "saved") return;
              useToastStore.getState().notify(SAVE_FAILED[result] ?? SAVE_FAILED.failed, "bad");
            });
            return;
          }
          if (action === "delete") {
            setOpen(false);
            void clear();
          }
        }}
      />
    </>
  );
}
