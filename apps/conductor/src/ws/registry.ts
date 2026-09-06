import { sendServerMessage, type WebSocketSender } from "@/ws/protocol";

const boundCharacters = new Map<WebSocketSender, Set<string>>();

export function trackSocket(ws: WebSocketSender): void {
  if (!boundCharacters.has(ws)) {
    boundCharacters.set(ws, new Set());
  }
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
}

export function socketsForCharacter(characterId: string): WebSocketSender[] {
  const matches: WebSocketSender[] = [];
  for (const [ws, bound] of boundCharacters) {
    if (bound.has(characterId)) matches.push(ws);
  }
  return matches;
}

export function broadcastToCharacter(characterId: string, message: unknown): number {
  let delivered = 0;

  for (const ws of socketsForCharacter(characterId)) {
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
