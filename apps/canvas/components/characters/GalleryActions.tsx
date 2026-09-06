import { GALLERY_COPY } from "@eidolon/config";
import { ScrollView, Text, View } from "react-native";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import {
  Download01Icon,
  Image01Icon,
  SentIcon,
  SmileIcon,
  Cancel01Icon as TrashIcon,
} from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

export type GalleryAction = "chat" | "avatar" | "face" | "background" | "save" | "delete";

const LABELS: Record<GalleryAction, string> = {
  chat: GALLERY_COPY.findInChat,
  avatar: GALLERY_COPY.useAsAvatar,
  face: GALLERY_COPY.useAsFace,
  background: GALLERY_COPY.useAsBackground,
  save: GALLERY_COPY.saveLabel,
  delete: GALLERY_COPY.deleteLabel,
};

const ICONS: Record<GalleryAction, Parameters<typeof AppIcon>[0]["icon"]> = {
  chat: SentIcon,
  avatar: SmileIcon,
  face: SmileIcon,
  background: Image01Icon,
  save: Download01Icon,
  delete: TrashIcon,
};

export interface GalleryActionsProps {
  characterId: string;
  actions: GalleryAction[];
  onAction: (action: GalleryAction) => void;
}

/**
 * The same set the chat's photo viewer offers, plus a way back to the message
 * the picture arrived in. Laid out as a scrolling row because six labelled
 * controls do not fit across a phone.
 */
export function GalleryActions({ characterId, actions, onAction }: GalleryActionsProps) {
  const theme = useResolvedTheme(characterId);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
    >
      {actions.map((action) => (
        <PressableScale
          key={action}
          accessibilityRole="button"
          accessibilityLabel={LABELS[action]}
          onPress={() => onAction(action)}
          className="flex-row items-center gap-2 border px-3 py-2"
          style={{
            borderRadius: theme.radius,
            borderColor: action === "delete" ? theme.danger : "rgba(255,255,255,0.25)",
            backgroundColor: "rgba(0,0,0,0.55)",
          }}
        >
          <View>
            <AppIcon
              icon={ICONS[action]}
              size={16}
              color={action === "delete" ? theme.danger : "#fff"}
              strokeWidth={2}
            />
          </View>
          <Text
            className="font-ui text-xs"
            style={{ color: action === "delete" ? theme.danger : "#fff" }}
          >
            {LABELS[action]}
          </Text>
        </PressableScale>
      ))}
    </ScrollView>
  );
}
