import { messageOwner, setMessageAudio } from "@/db";
import { mp3DurationSeconds } from "@/services/audio-duration";
import { isStorageConnected, uploadAudio } from "@/services/storage";

export interface StoredVoiceNote {
  url: string | null;
  durationSeconds: number | null;
}

export async function storeVoiceNote(
  characterId: string,
  messageId: string,
  base64Mp3: string,
): Promise<StoredVoiceNote> {
  const bytes = Buffer.from(base64Mp3, "base64");
  const durationSeconds = mp3DurationSeconds(bytes);

  if (!isStorageConnected()) return { url: null, durationSeconds };

  const userId = messageOwner(messageId);
  if (!userId) {
    console.error(`[voice-notes] message ${messageId} has no user, so the note cannot be filed`);
    return { url: null, durationSeconds };
  }

  try {
    const stored = await uploadAudio(userId, characterId, `${messageId}.mp3`, bytes);
    const url = `${stored}${stored.includes("?") ? "&" : "?"}v=${Date.now().toString(36)}`;

    setMessageAudio(messageId, url, durationSeconds);
    return { url, durationSeconds };
  } catch (error) {
    console.error("[voice-notes] upload failed", error);
    return { url: null, durationSeconds };
  }
}
