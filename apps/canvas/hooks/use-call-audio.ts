import { CALL } from "@eidolon/config";
import {
  type AudioSample,
  requestRecordingPermissionsAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioSampleListener,
} from "expo-audio";
import * as React from "react";
import { type SharedValue, useSharedValue } from "react-native-reanimated";
import { cacheSpokenSentence, clearSpokenSentences, inlineAudioUri } from "@/lib/audio-cache";
import type { SpokenChunk } from "@/store/call-store";
import { useCallStore } from "@/store/call-store";

export interface CallAudio {
  amplitude: SharedValue<number>;
  isPlaying: boolean;
  isMetered: boolean;
  stop: () => void;
}

function sampleLevel(sample: AudioSample): number {
  let total = 0;
  let counted = 0;

  for (const channel of sample.channels) {
    const frames = channel.frames;
    for (let at = 0; at < frames.length; at += CALL.sampleStride) {
      const frame = frames[at] ?? 0;
      total += frame * frame;
      counted += 1;
    }
  }

  if (counted === 0) return 0;
  return Math.min(1, Math.sqrt(total / counted) * CALL.amplitudeGain);
}

function playableUri(chunk: SpokenChunk): string {
  if (chunk.url.length > 0) return chunk.url;
  return cacheSpokenSentence(chunk.key, chunk.data) ?? inlineAudioUri(chunk.data);
}

export function useCallAudio(): CallAudio {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const amplitude = useSharedValue(0);
  const speaking = React.useRef(false);

  const consume = useCallStore((state) => state.consume);
  const finishedSpeaking = useCallStore((state) => state.finishedSpeaking);
  const queued = useCallStore((state) => state.queue.length);
  const isSpeakerOn = useCallStore((state) => state.isSpeakerOn);

  const [isMetered, setMetered] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    void requestRecordingPermissionsAsync()
      .then(({ granted }) => {
        if (live) setMetered(granted && player.isAudioSamplingSupported);
      })
      .catch(() => {
        if (live) setMetered(false);
      });
    return () => {
      live = false;
    };
  }, [player]);

  useAudioSampleListener(
    player,
    React.useCallback(
      (sample: AudioSample) => {
        const level = sampleLevel(sample);
        const previous = amplitude.get();
        const smoothing = level > previous ? CALL.amplitudeAttack : CALL.amplitudeRelease;
        amplitude.set(previous + (level - previous) * smoothing);
      },
      [amplitude],
    ),
  );

  React.useEffect(() => {
    player.volume = isSpeakerOn ? 1 : 0;
  }, [player, isSpeakerOn]);

  const advance = React.useCallback(() => {
    const next = consume();
    if (!next) {
      speaking.current = false;
      amplitude.set(0);
      finishedSpeaking();
      return;
    }

    const uri = playableUri(next);
    if (uri.length === 0) {
      speaking.current = false;
      finishedSpeaking();
      return;
    }

    speaking.current = true;
    player.replace({ uri });
    player.play();
  }, [consume, finishedSpeaking, player, amplitude]);

  React.useEffect(() => {
    if (!speaking.current && queued > 0) advance();
  }, [queued, advance]);

  React.useEffect(() => {
    if (!status.didJustFinish || !speaking.current) return;
    speaking.current = false;
    advance();
  }, [status.didJustFinish, advance]);

  React.useEffect(() => {
    if (isMetered) return;
    amplitude.set(status.playing ? CALL.unmeteredLevel : 0);
  }, [isMetered, status.playing, amplitude]);

  const stop = React.useCallback(() => {
    speaking.current = false;
    amplitude.set(0);
    player.pause();
    clearSpokenSentences();
  }, [player, amplitude]);

  React.useEffect(() => clearSpokenSentences, []);

  return { amplitude, isPlaying: status.playing, isMetered, stop };
}
