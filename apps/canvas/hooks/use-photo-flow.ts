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
  editing: string | null;
  avatarUri: string | null;
  viewAvatar: (uri: string | null) => void;
  closeAvatar: () => void;
}

export function usePhotoFlow(characterId: string, serverHost: string): PhotoFlow {
  const requestImage = useChatStore((state) => state.requestImage);
  const [isSheetOpen, setSheetOpen] = React.useState(false);
  const [viewing, setViewing] = React.useState<ChatMessage | null>(null);
  const [avatarUri, setAvatarUri] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<string | null>(null);

  const openSheet = React.useCallback(() => {
    setEditing(null);
    setSheetOpen(true);
  }, []);
  const closeSheet = React.useCallback(() => setSheetOpen(false), []);
  const closeViewer = React.useCallback(() => setViewing(null), []);
  const viewAvatar = React.useCallback((uri: string | null) => setAvatarUri(uri), []);
  const closeAvatar = React.useCallback(() => setAvatarUri(null), []);
  const view = React.useCallback((message: ChatMessage) => setViewing(message), []);

  const submit = React.useCallback(
    (situation: string, orientation: PhotoOrientation) => {
      requestImage(characterId, situation, orientation, editing);
    },
    [requestImage, characterId, editing],
  );

  // The profile picture is viewed without a message behind it, so actions read
  // the message's photo when there is one and the avatar otherwise.
  const activeUri = viewing?.imageUrl ?? avatarUri;

  const dismiss = React.useCallback(() => {
    setViewing(null);
    setAvatarUri(null);
  }, []);

  const act = React.useCallback(
    (action: PhotoAction) => {
      if (!activeUri) return;

      if (action === "save") {
        void savePhotoToDevice(activeUri).then((result) => {
          if (result === "saved") return;
          useChatStore.setState({ lastError: SAVE_ERRORS[result] });
        });
        dismiss();
        return;
      }
      if (action === "face") {
        void saveLook(serverHost, characterId, { faceUrl: activeUri });
        dismiss();
        return;
      }
      if (action === "background") {
        void saveLook(serverHost, characterId, { backgroundUrl: activeUri });
        dismiss();
        return;
      }
      if (action === "delete") {
        if (viewing) void deletePhoto(serverHost, characterId, viewing.id);
        dismiss();
        return;
      }

      // Regenerate keeps the photo you were looking at, so what comes back is a
      // change to it rather than an unrelated picture of the same person.
      setEditing(activeUri);
      dismiss();
      setSheetOpen(true);
    },
    [activeUri, viewing, dismiss, serverHost, characterId],
  );

  const crop = React.useCallback(
    (rect: AvatarCropRect) => {
      if (!activeUri) return;
      void saveLook(serverHost, characterId, { avatarUrl: activeUri, avatarCrop: rect });
      dismiss();
    },
    [activeUri, dismiss, serverHost, characterId],
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
    editing,
    avatarUri,
    viewAvatar,
    closeAvatar,
  };
}
