import * as FileSystem from "expo-file-system/legacy";
import * as Font from "expo-font";

interface FontDefinition {
  name: string;
  file: string;
  url: string;
}

const REQUIRED_FONTS: FontDefinition[] = [
  {
    name: "NunitoSans-Regular",
    file: "NunitoSans-Regular.ttf",
    url: "https://raw.githubusercontent.com/googlefonts/NunitoSans/master/fonts/ttf/NunitoSans-Regular.ttf",
  },
  {
    name: "NunitoSans-Bold",
    file: "NunitoSans-Bold.ttf",
    url: "https://raw.githubusercontent.com/googlefonts/NunitoSans/master/fonts/ttf/NunitoSans-Bold.ttf",
  },
  {
    name: "NunitoSans-Italic",
    file: "NunitoSans-Italic.ttf",
    url: "https://raw.githubusercontent.com/googlefonts/NunitoSans/master/fonts/ttf/NunitoSans-Italic.ttf",
  },
  {
    name: "PublicSans-Regular",
    file: "PublicSans-Regular.ttf",
    url: "https://raw.githubusercontent.com/uswds/public-sans/master/fonts/ttf/PublicSans-Regular.ttf",
  },
  {
    name: "PublicSans-Medium",
    file: "PublicSans-Medium.ttf",
    url: "https://raw.githubusercontent.com/uswds/public-sans/master/fonts/ttf/PublicSans-Medium.ttf",
  },
  {
    name: "PublicSans-Bold",
    file: "PublicSans-Bold.ttf",
    url: "https://raw.githubusercontent.com/uswds/public-sans/master/fonts/ttf/PublicSans-Bold.ttf",
  },
];

/**
 * Initializes and registers Nunito Sans and Public Sans fonts via OTA CDN caching.
 */
export async function initializeFonts(): Promise<void> {
  const baseDir = FileSystem.documentDirectory;
  if (!baseDir) {
    // Web environment: register fonts directly via expo-font
    try {
      const webFonts: Record<string, string> = {};
      for (const font of REQUIRED_FONTS) {
        if (!Font.isLoaded(font.name)) {
          webFonts[font.name] = font.url;
        }
      }
      if (Object.keys(webFonts).length > 0) {
        await Font.loadAsync(webFonts);
      }
    } catch (e) {
      console.warn("Web font load error:", e);
    }
    return;
  }

  const fontDir = `${baseDir}fonts/`;

  try {
    const dirInfo = await FileSystem.getInfoAsync(fontDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(fontDir, { intermediates: true });
    }

    const fontsToLoad: Record<string, string> = {};

    for (const font of REQUIRED_FONTS) {
      if (Font.isLoaded(font.name)) {
        continue;
      }

      const localUri = `${fontDir}${font.file}`;
      const fileInfo = await FileSystem.getInfoAsync(localUri);

      if (!fileInfo.exists) {
        try {
          await FileSystem.downloadAsync(font.url, localUri);
        } catch (err) {
          console.warn(`Failed to download font: ${font.name}`, err);
          continue;
        }
      }

      fontsToLoad[font.name] = localUri;
    }

    if (Object.keys(fontsToLoad).length > 0) {
      await Font.loadAsync(fontsToLoad);
    }
  } catch (error) {
    console.warn("Error during OTA font initialization:", error);
  }
}

/**
 * Dynamically downloads, caches, and registers an arbitrary font OTA at runtime.
 * Once loaded, you can switch to it with vars({ '--font-main': fontName }).
 */
export async function loadDynamicFont(name: string, url: string): Promise<boolean> {
  if (Font.isLoaded(name)) {
    return true;
  }

  const baseDir = FileSystem.documentDirectory;
  if (!baseDir) {
    return false;
  }

  const fontDir = `${baseDir}fonts/`;
  const fileName = `${name.replace(/[^a-zA-Z0-9_-]/g, "_")}.ttf`;
  const localUri = `${fontDir}${fileName}`;

  try {
    const dirInfo = await FileSystem.getInfoAsync(fontDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(fontDir, { intermediates: true });
    }

    const fileInfo = await FileSystem.getInfoAsync(localUri);
    if (!fileInfo.exists) {
      await FileSystem.downloadAsync(url, localUri);
    }

    await Font.loadAsync({ [name]: localUri });
    return true;
  } catch (error) {
    console.warn(`Failed to dynamically load font '${name}':`, error);
    return false;
  }
}
