import { sendServerMessage, type WebSocketSender } from "@/ws/protocol";

const boundCharacters = new Map<WebSocketSender, Set<string>>();
const users = new Map<WebSocketSender, string>();

export function trackSocket(ws: WebSocketSender, userId: string): void {
  users.set(ws, userId);
  if (!boundCharacters.has(ws)) {
    boundCharacters.set(ws, new Set());
  }
}

export function userFor(ws: WebSocketSender): string | null {
  return users.get(ws) ?? null;
}

export function bindCharacter(ws: WebSocketSender, characterId: string): void {
  const bound = boundCharacters.get(ws);
  if (bound) {
    bound.add(characterId);
    return;
  }
  boundCharacters.set(ws, new Set([characterId]));
}

export function releaseSocket(ws: WebSocketSender): void {
  boundCharacters.delete(ws);
  users.delete(ws);
}

export function socketsForCharacter(characterId: string, userId: string): WebSocketSender[] {
  const matches: WebSocketSender[] = [];
  for (const [ws, bound] of boundCharacters) {
    if (bound.has(characterId) && users.get(ws) === userId) matches.push(ws);
  }
  return matches;
}

export function broadcastToEveryUser(characterId: string, message: unknown): number {
  let delivered = 0;

  for (const [ws, bound] of boundCharacters) {
    if (!bound.has(characterId)) continue;
    try {
      sendServerMessage(ws, message);
      delivered += 1;
    } catch (error) {
      console.error("[ws] broadcast failed, dropping socket", error);
      releaseSocket(ws);
    }
  }

  return delivered;
}

export function broadcastToCharacter(
  characterId: string,
  userId: string,
  message: unknown,
): number {
  let delivered = 0;

  for (const ws of socketsForCharacter(characterId, userId)) {
    try {
      sendServerMessage(ws, message);
      delivered += 1;
    } catch (error) {
      console.error("[ws] broadcast failed, dropping socket", error);
      releaseSocket(ws);
    }
  }

  return delivered;
}
