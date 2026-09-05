import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as React from "react";

export interface VoiceNotes {
  activeId: string | null;
  isPlaying: boolean;
  isBuffering: boolean;
  seconds: number;
  toggle: (id: string, url: string) => void;
}

const VoiceNotesContext = React.createContext<VoiceNotes | null>(null);

/**
 * One player for the whole screen.
 *
 * A player owned by a message card dies the moment FlashList recycles that
 * cell, which is what stopped playback as soon as you scrolled. Hoisting it
 * above the list makes playback survive scrolling, and makes "one voice note at
 * a time" true by construction rather than by bookkeeping.
 */
export function VoiceNotesProvider({
  autoPlay,
  children,
}: {
  autoPlay?: { id: string; url: string } | null;
  children: React.ReactNode;
}) {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const autoPlayed = React.useRef<string | null>(null);

  const play = React.useCallback(
    (id: string, url: string) => {
      if (activeId !== id) {
        player.replace(url);
        setActiveId(id);
      }
      player.play();
    },
    [activeId, player],
  );

  const toggle = React.useCallback(
    (id: string, url: string) => {
      if (activeId === id && status.playing) {
        player.pause();
        return;
      }
      play(id, url);
    },
    [activeId, status.playing, player, play],
  );

  React.useEffect(() => {
    if (!status.didJustFinish) return;
    player.pause();
    player.seekTo(0);
  }, [status.didJustFinish, player]);

  React.useEffect(() => {
    if (!autoPlay || autoPlayed.current === autoPlay.id) return;
    autoPlayed.current = autoPlay.id;
    play(autoPlay.id, autoPlay.url);
  }, [autoPlay, play]);

  const value = React.useMemo<VoiceNotes>(
    () => ({
      activeId,
      isPlaying: status.playing,
      isBuffering: status.isBuffering,
      seconds: status.duration > 0 ? status.duration : 0,
      toggle,
    }),
    [activeId, status.playing, status.isBuffering, status.duration, toggle],
  );

  return <VoiceNotesContext.Provider value={value}>{children}</VoiceNotesContext.Provider>;
}

export function useVoiceNotes(): VoiceNotes | null {
  return React.useContext(VoiceNotesContext);
}
