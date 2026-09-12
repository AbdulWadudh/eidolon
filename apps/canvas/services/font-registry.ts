import * as FileSystem from "expo-file-system/legacy";
import * as Font from "expo-font";
import type { GoogleFontFamily } from "@/services/google-fonts";
import { appStorage } from "@/store/storage";

const CUSTOM_FONTS_KEY = "eidolon.fonts.custom";

type InstalledFonts = Record<string, Record<string, string>>;

interface FontDefinition {
  name: string;
  asset: number;
}

const REQUIRED_FONTS: FontDefinition[] = [
  {
    name: "NunitoSans-Regular",
    asset: require("../assets/fonts/NunitoSans-Regular.ttf"),
  },
  {
    name: "NunitoSans-Bold",
    asset: require("../assets/fonts/NunitoSans-Bold.ttf"),
  },
  {
    name: "NunitoSans-Italic",
    asset: require("../assets/fonts/NunitoSans-Italic.ttf"),
  },
  {
    name: "PublicSans-Regular",
    asset: require("../assets/fonts/PublicSans-Regular.ttf"),
  },
  {
    name: "PublicSans-Medium",
    asset: require("../assets/fonts/PublicSans-Medium.ttf"),
  },
  {
    name: "PublicSans-Bold",
    asset: require("../assets/fonts/PublicSans-Bold.ttf"),
  },
];

function readInstalledFonts(): InstalledFonts {
  try {
    const raw = appStorage.getString(CUSTOM_FONTS_KEY);
    return raw ? (JSON.parse(raw) as InstalledFonts) : {};
  } catch (err) {
    console.warn("Failed to read installed fonts:", err);
    return {};
  }
}

function writeInstalledFonts(fonts: InstalledFonts): void {
  try {
    appStorage.set(CUSTOM_FONTS_KEY, JSON.stringify(fonts));
  } catch (err) {
    console.warn("Failed to persist installed fonts:", err);
  }
}

export interface InstalledFontFamily {
  family: string;
  value: string;
}

export function getInstalledFontFamilies(): InstalledFontFamily[] {
  return Object.keys(readInstalledFonts()).map((base) => ({
    family: base,
    value: `${base}-Regular`,
  }));
}

function faceUrlsFor(files: GoogleFontFamily["files"], base: string): Record<string, string> {
  const regular = files.regular ?? files["400"] ?? Object.values(files)[0];
  if (!regular) return {};
  return {
    [`${base}-Regular`]: regular,
    [`${base}-Medium`]: files["500"] ?? regular,
    [`${base}-Bold`]: files["700"] ?? files["600"] ?? files["800"] ?? regular,
    [`${base}-Italic`]: files.italic ?? regular,
  };
}

export function familyBaseName(family: string): string {
  return family.replace(/[^a-zA-Z0-9]/g, "");
}

export async function installGoogleFont(entry: GoogleFontFamily): Promise<string | null> {
  const base = familyBaseName(entry.family);
  if (!base) return null;

  const faces = faceUrlsFor(entry.files, base);
  if (Object.keys(faces).length === 0) return null;

  await loadDynamicFonts(faces);

  const installed = readInstalledFonts();
  installed[base] = faces;
  writeInstalledFonts(installed);

  return `${base}-Regular`;
}

async function restoreInstalledFonts(): Promise<void> {
  const installed = readInstalledFonts();
  for (const faces of Object.values(installed)) {
    for (const [name, url] of Object.entries(faces)) {
      if (!Font.isLoaded(name)) {
        await loadDynamicFont(name, url);
      }
    }
  }
}

const BUNDLED_FONT_ALIASES: Record<string, string> = {
  "NunitoSans-Medium": "NunitoSans-Regular",
  "PublicSans-Italic": "PublicSans-Regular",
};

function requiredFontByName(name: string): FontDefinition | undefined {
  return REQUIRED_FONTS.find((font) => font.name === name);
}

export async function initializeFonts(): Promise<void> {
  try {
    const fontsToLoad: Record<string, number> = {};

    for (const font of REQUIRED_FONTS) {
      if (!Font.isLoaded(font.name)) fontsToLoad[font.name] = font.asset;
    }

    for (const [alias, target] of Object.entries(BUNDLED_FONT_ALIASES)) {
      if (Font.isLoaded(alias)) continue;
      const source = requiredFontByName(target);
      if (source) fontsToLoad[alias] = source.asset;
    }

    if (Object.keys(fontsToLoad).length > 0) {
      await Font.loadAsync(fontsToLoad);
    }
  } catch (error) {
    console.warn("Error loading bundled fonts:", error);
  }

  await restoreInstalledFonts();
}

export async function loadDynamicFont(name: string, url: string): Promise<boolean> {
  try {
    await loadDynamicFonts({ [name]: url });
    return true;
  } catch (error) {
    console.warn(`Failed to dynamically load font '${name}':`, error);
    return false;
  }
}

function fileExtensionFor(url: string): string {
  const match = /\.(ttf|otf|woff2?)(?:[?#]|$)/i.exec(url);
  return match ? match[1].toLowerCase() : "ttf";
}

export async function loadDynamicFonts(faces: Record<string, string>): Promise<void> {
  const pending = Object.entries(faces).filter(([name]) => !Font.isLoaded(name));
  if (pending.length === 0) return;

  const baseDir = FileSystem.documentDirectory;
  if (!baseDir) {
    await Font.loadAsync(Object.fromEntries(pending));
    return;
  }

  const fontDir = `${baseDir}fonts/`;
  const dirInfo = await FileSystem.getInfoAsync(fontDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(fontDir, { intermediates: true });
  }

  const localUriByUrl = new Map<string, string>();
  for (const [name, url] of pending) {
    if (localUriByUrl.has(url)) continue;
    const fileName = `${name.replace(/[^a-zA-Z0-9_-]/g, "_")}.${fileExtensionFor(url)}`;
    const localUri = `${fontDir}${fileName}`;
    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) {
      const result = await FileSystem.downloadAsync(url, localUri);
      if (result.status !== 200) {
        throw new Error(`Download failed with HTTP ${result.status}.`);
      }
    }
    localUriByUrl.set(url, localUri);
  }

  const toLoad: Record<string, string> = {};
  for (const [name, url] of pending) {
    const localUri = localUriByUrl.get(url);
    if (localUri) toLoad[name] = localUri;
  }
  await Font.loadAsync(toLoad);
}
