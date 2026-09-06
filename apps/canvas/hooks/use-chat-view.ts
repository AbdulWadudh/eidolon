import * as React from "react";
import { useChatStore } from "@/store/chat-store";
import { type ChatView, projectChat } from "@/store/chat-view";

export type { ChatView };

/**
 * Subscribes to the whole store rather than passing `projectChat` as a
 * selector: the projection builds a new object every call, and a selector that
 * never returns a stable reference re-renders without end.
 */
export function useChatView(characterId: string): ChatView {
  const state = useChatStore();
  return React.useMemo(() => projectChat(state, characterId), [state, characterId]);
}
