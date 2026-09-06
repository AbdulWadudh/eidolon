import { characterLookUrl, characterMessageUrl, TIMEOUTS_MS } from "@eidolon/config";
import { useChatStore } from "./chat-store";

export type PhotoOrientation = "portrait" | "landscape";

export interface AvatarCropRect {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface CharacterLook {
  avatarUrl: string | null;
  avatarCrop: AvatarCropRect | null;
  backgroundUrl: string | null;
}

export interface LookPatch {
  avatarUrl?: string | null;
  avatarCrop?: AvatarCropRect | null;
  backgroundUrl?: string | null;
}

export async function saveLook(host: string, characterId: string, patch: LookPatch): Promise<void> {
  useChatStore.setState((state) => ({ characterLook: { ...state.characterLook, ...patch } }));
  if (!host) return;

  try {
    const response = await fetch(characterLookUrl(host, characterId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(patch),
      signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
    });
    if (!response.ok) throw new Error(`Conductor returned HTTP ${response.status}.`);

    const body = (await response.json()) as { character?: CharacterLook };
    if (body.character) {
      useChatStore.setState({
        characterLook: {
          avatarUrl: body.character.avatarUrl ?? null,
          avatarCrop: body.character.avatarCrop ?? null,
          backgroundUrl: body.character.backgroundUrl ?? null,
        },
      });
    }
  } catch (err) {
    useChatStore.setState({
      lastError: err instanceof Error ? err.message : "Could not save that.",
    });
  }
}

export async function deletePhoto(
  host: string,
  characterId: string,
  messageId: string,
): Promise<void> {
  useChatStore.setState((state) => ({
    messages: state.messages.filter((message) => message.id !== messageId),
  }));
  if (!host) return;

  try {
    await fetch(characterMessageUrl(host, characterId, messageId), {
      method: "DELETE",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
    });
  } catch (err) {
    useChatStore.setState({
      lastError: err instanceof Error ? err.message : "Could not delete that photo.",
    });
  }
}
