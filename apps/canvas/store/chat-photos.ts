import { characterLookUrl, characterMessageUrl, TIMEOUTS_MS } from "@eidolon/config";
import { useChatStore } from "./chat-store";

export type PhotoOrientation = "portrait" | "landscape";

// The circle expressed in the photo's own coordinates: where its centre sits
// (0..1 of the image), and how many circle-widths the whole image spans. That
// is all the avatar needs to lay the image out, and it does not depend on the
// screen it was chosen on.
export interface AvatarCropRect {
  cx: number;
  cy: number;
  widthRatio: number;
  heightRatio: number;
}

export interface CharacterLook {
  avatarUrl: string | null;
  avatarCrop: AvatarCropRect | null;
  backgroundUrl: string | null;
  faceUrl: string | null;
}

export interface LookPatch {
  avatarUrl?: string | null;
  avatarCrop?: AvatarCropRect | null;
  backgroundUrl?: string | null;
  faceUrl?: string | null;
}

/** Reads her look without touching the chat store, for screens outside the chat. */
export async function fetchLook(host: string, characterId: string): Promise<CharacterLook | null> {
  if (!host) return null;

  try {
    const response = await fetch(characterLookUrl(host, characterId), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUTS_MS.clientRequest),
    });
    if (!response.ok) return null;

    const body = (await response.json()) as { character?: CharacterLook };
    return body.character ?? null;
  } catch {
    return null;
  }
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
          faceUrl: body.character.faceUrl ?? null,
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
