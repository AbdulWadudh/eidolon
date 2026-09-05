import { setMessageAudio } from "@/db";
import { isStorageConnected, uploadAudio } from "@/services/storage";

export async function storeVoiceNote(
  characterId: string,
  messageId: string,
  base64Mp3: string,
): Promise<string | null> {
  if (!isStorageConnected()) return null;

  try {
    const url = await uploadAudio(
      characterId,
      `${messageId}.mp3`,
      Buffer.from(base64Mp3, "base64"),
    );
    setMessageAudio(messageId, url);
    return url;
  } catch (error) {
    console.error("[voice-notes] upload failed", error);
    return null;
  }
}
