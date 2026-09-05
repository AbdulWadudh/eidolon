import * as React from "react";
import { onServerMessage, useConductorSocket } from "@/services/websocket";
import { useChatStore } from "@/store/chat-store";

export function useChatSocket(characterId: string) {
  const socket = useConductorSocket();
  const handleServerMessage = useChatStore((state) => state.handleServerMessage);
  const setActiveCharacter = useChatStore((state) => state.setActiveCharacter);

  React.useEffect(() => {
    setActiveCharacter(characterId);
  }, [characterId, setActiveCharacter]);

  React.useEffect(() => onServerMessage(handleServerMessage), [handleServerMessage]);

  return socket;
}
