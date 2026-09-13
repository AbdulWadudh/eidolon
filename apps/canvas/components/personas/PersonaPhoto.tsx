import { PERSONA_COPY } from "@eidolon/config";
import * as DocumentPicker from "expo-document-picker";
import { Image } from "expo-image";
import * as React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Delete02Icon, FileUploadIcon, UserIcon } from "@/lib/icons";
import { tap } from "@/services/haptics";
import { type Persona, removePhoto, uploadPhoto } from "@/store/persona-api";
import { useResolvedTheme } from "@/store/theme-store";
import { useToastStore } from "@/store/toast-store";

const PHOTO_PX = 72;

export interface PersonaPhotoProps {
  serverHost: string;
  persona: Persona;
  onChanged: (persona: Persona) => void;
}

export function PersonaPhoto({ serverHost, persona, onChanged }: PersonaPhotoProps) {
  const theme = useResolvedTheme();
  const [isBusy, setBusy] = React.useState(false);

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
    <View className="flex-row items-center gap-3.5">
      <Avatar size={PHOTO_PX} className="overflow-hidden border border-border">
        {isBusy ? (
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

      <View className="flex-1 gap-2">
        <Text className="font-ui text-[10.5px] text-text-muted leading-[14px]">
          {PERSONA_COPY.photoHint}
        </Text>

        <View className="flex-row gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-row gap-1.5"
            disabled={isBusy}
            onPress={() => void pick()}
          >
            <AppIcon icon={FileUploadIcon} size={13} color={theme.textPrimary} />
            <Text className="font-ui-medium text-[11px] text-text-primary">
              {PERSONA_COPY.photoChange}
            </Text>
          </Button>

          {persona.photoUrl ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={PERSONA_COPY.photoRemove}
              hitSlop={8}
              disabled={isBusy}
              onPress={() => void clear()}
              className="h-8 w-8 items-center justify-center rounded-full active:bg-input"
            >
              <AppIcon icon={Delete02Icon} size={14} color={theme.danger} strokeWidth={1.6} />
            </PressableScale>
          ) : null}
        </View>
      </View>
    </View>
  );
}
