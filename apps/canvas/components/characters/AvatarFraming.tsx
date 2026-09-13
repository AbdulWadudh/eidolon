import { UI_MS } from "@eidolon/config";
import * as React from "react";
import { Modal, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { AvatarCrop } from "@/components/chat/AvatarCrop";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { CropIcon, Image01Icon } from "@/lib/icons";
import { type AvatarCropRect, saveLook } from "@/store/chat-photos";
import { useResolvedTheme } from "@/store/theme-store";

export interface AvatarFramingProps {
  characterId: string;
  serverHost: string;
  avatarUrl: string | null;
  avatarCrop: AvatarCropRect | null;
  onFramed: (crop: AvatarCropRect | null) => void;
}

export function AvatarFraming({
  characterId,
  serverHost,
  avatarUrl,
  avatarCrop,
  onFramed,
}: AvatarFramingProps) {
  const reduced = useReducedMotion();
  const [isCropping, setCropping] = React.useState(false);

  const save = React.useCallback(
    (crop: AvatarCropRect | null) => {
      if (!avatarUrl) return;
      void saveLook(serverHost, characterId, { avatarUrl, avatarCrop: crop });
      onFramed(crop);
    },
    [avatarUrl, serverHost, characterId, onFramed],
  );

  if (!avatarUrl) return null;

  return (
    <>
      <View className="mt-4 flex-row gap-2">
        <Option
          characterId={characterId}
          icon={CropIcon}
          label="Pick a part"
          hint="Frame it yourself"
          isOn={avatarCrop !== null}
          onPress={() => setCropping(true)}
        />
        <Option
          characterId={characterId}
          icon={Image01Icon}
          label="Use it all"
          hint="The whole photo"
          isOn={avatarCrop === null}
          onPress={() => save(null)}
        />
      </View>

      <Modal
        visible={isCropping}
        transparent
        animationType="none"
        onRequestClose={() => setCropping(false)}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Animated.View
            entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
            className="flex-1"
            style={{ backgroundColor: "rgba(0,0,0,0.94)" }}
          >
            <AvatarCrop
              uri={avatarUrl}
              characterId={characterId}
              onCancel={() => setCropping(false)}
              onConfirm={(crop) => {
                setCropping(false);
                save(crop);
              }}
            />
          </Animated.View>
        </GestureHandlerRootView>
      </Modal>

      <Text className="mt-2 font-ui text-[11px] text-text-muted">
        {avatarCrop === null
          ? "The profile picture uses the whole photo, filled from the top."
          : "The profile picture uses the part you framed."}
      </Text>
    </>
  );
}

function Option({
  characterId,
  icon,
  label,
  hint,
  isOn,
  onPress,
}: {
  characterId: string;
  icon: Parameters<typeof AppIcon>[0]["icon"];
  label: string;
  hint: string;
  isOn: boolean;
  onPress: () => void;
}) {
  const theme = useResolvedTheme(characterId);

  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${hint}`}
      accessibilityState={{ selected: isOn }}
      onPress={onPress}
      className="flex-1 flex-row items-center gap-2.5 border px-3 py-2.5"
      style={{
        borderRadius: theme.radius,
        borderColor: isOn ? theme.primary : theme.cardBorder,
        backgroundColor: theme.inputSurface,
      }}
    >
      <AppIcon
        icon={icon}
        size={16}
        color={isOn ? theme.primary : theme.textMuted}
        strokeWidth={1.6}
      />
      <View className="flex-1">
        <Text className="font-ui-bold text-[13px] text-text-primary">{label}</Text>
        <Text className="font-ui text-[11px] text-text-muted">{hint}</Text>
      </View>
    </PressableScale>
  );
}
