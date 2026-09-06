import * as React from "react";
import type { PhotoAction } from "@/components/chat/PhotoViewer";
import { savePhotoToDevice } from "@/lib/save-photo";
import type { ChatMessage } from "@/store/chat-messages";
import {
  type AvatarCropRect,
  deletePhoto,
  type PhotoOrientation,
  saveLook,
} from "@/store/chat-photos";
import { useChatStore } from "@/store/chat-store";

const SAVE_ERRORS: Record<string, string> = {
  denied: "Eidolon needs permission to save photos.",
  unavailable: "Saving photos needs a new build of the app.",
  failed: "Could not save that photo.",
};

export interface PhotoFlow {
  isSheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  submit: (situation: string, orientation: PhotoOrientation) => void;
  viewing: ChatMessage | null;
  view: (message: ChatMessage) => void;
  closeViewer: () => void;
  act: (action: PhotoAction) => void;
  crop: (rect: AvatarCropRect) => void;
  avatarUri: string | null;
  viewAvatar: (uri: string | null) => void;
  closeAvatar: () => void;
}

export function usePhotoFlow(characterId: string, serverHost: string): PhotoFlow {
  const requestImage = useChatStore((state) => state.requestImage);
  const [isSheetOpen, setSheetOpen] = React.useState(false);
  const [viewing, setViewing] = React.useState<ChatMessage | null>(null);
  const [avatarUri, setAvatarUri] = React.useState<string | null>(null);

  const openSheet = React.useCallback(() => setSheetOpen(true), []);
  const closeSheet = React.useCallback(() => setSheetOpen(false), []);
  const closeViewer = React.useCallback(() => setViewing(null), []);
  const viewAvatar = React.useCallback((uri: string | null) => setAvatarUri(uri), []);
  const closeAvatar = React.useCallback(() => setAvatarUri(null), []);
  const view = React.useCallback((message: ChatMessage) => setViewing(message), []);

  const submit = React.useCallback(
    (situation: string, orientation: PhotoOrientation) => {
      requestImage(characterId, situation, orientation);
    },
    [requestImage, characterId],
  );

  const act = React.useCallback(
    (action: PhotoAction) => {
      const target = viewing;
      if (!target?.imageUrl) return;

      if (action === "save") {
        void savePhotoToDevice(target.imageUrl).then((result) => {
          if (result === "saved") return;
          useChatStore.setState({ lastError: SAVE_ERRORS[result] });
        });
        setViewing(null);
        return;
      }
      if (action === "background") {
        void saveLook(serverHost, characterId, { backgroundUrl: target.imageUrl });
        setViewing(null);
        return;
      }
      if (action === "delete") {
        void deletePhoto(serverHost, characterId, target.id);
        setViewing(null);
        return;
      }

      setViewing(null);
      setSheetOpen(true);
    },
    [viewing, serverHost, characterId],
  );

  const crop = React.useCallback(
    (rect: AvatarCropRect) => {
      const target = viewing;
      if (!target?.imageUrl) return;
      void saveLook(serverHost, characterId, { avatarUrl: target.imageUrl, avatarCrop: rect });
      setViewing(null);
    },
    [viewing, serverHost, characterId],
  );

  return {
    isSheetOpen,
    openSheet,
    closeSheet,
    submit,
    viewing,
    view,
    closeViewer,
    act,
    crop,
    avatarUri,
    viewAvatar,
    closeAvatar,
  };
}
