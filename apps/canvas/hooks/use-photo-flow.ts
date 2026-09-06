import * as React from "react";
import type { PhotoAction } from "@/components/chat/PhotoViewer";
import type { ChatMessage } from "@/store/chat-messages";
import { deletePhoto, type PhotoOrientation, saveLook } from "@/store/chat-photos";
import { useChatStore } from "@/store/chat-store";

export interface PhotoFlow {
  isSheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  submit: (situation: string, orientation: PhotoOrientation) => void;
  viewing: ChatMessage | null;
  view: (message: ChatMessage) => void;
  closeViewer: () => void;
  act: (action: PhotoAction) => void;
}

export function usePhotoFlow(characterId: string, serverHost: string): PhotoFlow {
  const requestImage = useChatStore((state) => state.requestImage);
  const [isSheetOpen, setSheetOpen] = React.useState(false);
  const [viewing, setViewing] = React.useState<ChatMessage | null>(null);

  const openSheet = React.useCallback(() => setSheetOpen(true), []);
  const closeSheet = React.useCallback(() => setSheetOpen(false), []);
  const closeViewer = React.useCallback(() => setViewing(null), []);
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

      if (action === "avatar") {
        void saveLook(serverHost, characterId, { avatarUrl: target.imageUrl });
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

  return { isSheetOpen, openSheet, closeSheet, submit, viewing, view, closeViewer, act };
}
