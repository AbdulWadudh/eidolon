import * as React from "react";
import { onServerMessage, onSocketStatus, useConductorSocket } from "@/services/websocket";
import { useChatStore } from "@/store/chat-store";

export function useChatSocket(characterId: string) {
  const socket = useConductorSocket();
  const handleServerMessage = useChatStore((state) => state.handleServerMessage);
  const setActiveCharacter = useChatStore((state) => state.setActiveCharacter);

  React.useEffect(() => {
    setActiveCharacter(characterId);
  }, [characterId, setActiveCharacter]);

  React.useEffect(() => onServerMessage(handleServerMessage), [handleServerMessage]);

  // A photo and a reply both end with an event from the conductor, so if the
  // socket drops while one is in flight that event never arrives and the card
  // sits there for good. Losing the connection is the end of the turn.
  React.useEffect(
    () =>
      onSocketStatus((status) => {
        if (status === "connected") return;

        const state = useChatStore.getState();
        if (!state.isPainting && !state.isStreaming) return;

        useChatStore.setState({
          isPainting: false,
          paintingStep: 0,
          paintingTotal: 0,
          paintingPreview: null,
          isStreaming: false,
          activeStatus: "idle",
          statusDetail: null,
          lastError: "Lost the connection before that finished.",
        });
      }),
    [],
  );

  return socket;
}
