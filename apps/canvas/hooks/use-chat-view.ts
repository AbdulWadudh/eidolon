import * as React from "react";
import { useChatStore } from "@/store/chat-store";
import { type ChatView, projectChat } from "@/store/chat-view";

export type { ChatView };

export function useChatView(characterId: string): ChatView {
  const state = useChatStore();
  return React.useMemo(() => projectChat(state, characterId), [state, characterId]);
}
