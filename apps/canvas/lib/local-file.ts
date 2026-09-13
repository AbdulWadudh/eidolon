import { File } from "expo-file-system";

export interface LocalFile {
  base64: string;
  bytes: number;
}

export async function readFileAsBase64(uri: string): Promise<LocalFile | null> {
  try {
    const file = new File(uri);
    if (!file.exists) return null;

    const base64 = await file.base64();
    if (!base64 || base64.length === 0) return null;

    return { base64, bytes: file.size ?? 0 };
  } catch (error) {
    console.error("[upload] could not read the picked file", error);
    return null;
  }
}
