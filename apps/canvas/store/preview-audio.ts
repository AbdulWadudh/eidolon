import { type AudioPlayer, createAudioPlayer } from "expo-audio";
import { create } from "zustand";

export interface PreviewAudioStore {
  playingUrl: string | null;
  loadingUrl: string | null;
  toggle: (url: string) => void;
  stop: () => void;
}

let player: AudioPlayer | null = null;

function ensurePlayer(): AudioPlayer {
  if (player) return player;

  const made = createAudioPlayer();
  made.addListener("playbackStatusUpdate", (status) => {
    if (status.didJustFinish) usePreviewAudio.setState({ playingUrl: null, loadingUrl: null });
  });

  player = made;
  return made;
}

export const usePreviewAudio = create<PreviewAudioStore>((set, get) => ({
  playingUrl: null,
  loadingUrl: null,

  toggle: (url) => {
    const { playingUrl } = get();
    const held = ensurePlayer();

    if (playingUrl === url) {
      held.pause();
      set({ playingUrl: null, loadingUrl: null });
      return;
    }

    set({ loadingUrl: url });

    try {
      held.replace({ uri: url });
      held.play();
      set({ playingUrl: url, loadingUrl: null });
    } catch (error) {
      console.warn("[preview-audio]", error);
      set({ playingUrl: null, loadingUrl: null });
    }
  },

  stop: () => {
    if (player) player.pause();
    set({ playingUrl: null, loadingUrl: null });
  },
}));
