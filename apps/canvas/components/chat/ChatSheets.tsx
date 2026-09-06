import { CharacterSettingsSheet } from "@/components/chat/CharacterSettingsSheet";
import { MindDrawer } from "@/components/chat/MindDrawer";
import { ThemeStudioSheet } from "@/components/theme/ThemeStudioSheet";

export interface ChatSheetsProps {
  characterId: string;
  characterName: string;
  serverHost: string;
  settingsOpen: boolean;
  themeOpen: boolean;
  mindOpen: boolean;
  onCloseSettings: () => void;
  onOpenTheme: () => void;
  onForked: (id: string) => void;
  onCloseTheme: () => void;
  onCloseMind: () => void;
}

/**
 * The three sheets the chat screen can raise. They are grouped here so the
 * screen itself stays about the conversation rather than about modals.
 */
export function ChatSheets({
  characterId,
  characterName,
  serverHost,
  settingsOpen,
  themeOpen,
  mindOpen,
  onCloseSettings,
  onOpenTheme,
  onForked,
  onCloseTheme,
  onCloseMind,
}: ChatSheetsProps) {
  return (
    <>
      <CharacterSettingsSheet
        isOpen={settingsOpen}
        characterId={characterId}
        onClose={onCloseSettings}
        onOpenTheme={onOpenTheme}
        onForked={onForked}
      />

      <ThemeStudioSheet
        isOpen={themeOpen}
        characterId={characterId}
        characterName={characterName}
        onClose={onCloseTheme}
      />

      <MindDrawer
        isOpen={mindOpen}
        characterId={characterId}
        serverHost={serverHost}
        onClose={onCloseMind}
      />
    </>
  );
}
