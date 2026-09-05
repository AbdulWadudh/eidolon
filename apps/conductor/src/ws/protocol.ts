import { parseServerMessage } from "@eidolon/protocol";

export interface WebSocketSender {
  send: (data: string) => void;
}

export function sendServerMessage(ws: WebSocketSender, message: unknown): void {
  ws.send(JSON.stringify(parseServerMessage(message)));
}
