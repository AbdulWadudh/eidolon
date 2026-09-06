import { SPEECH } from "@eidolon/config";
import * as React from "react";

export interface AutoListen {
  isArmed: boolean;
  noteSpeechStart: () => void;
  noteSpeechEnd: () => void;
}

export interface AutoListenOptions {
  enabled: boolean;
  shouldOpen: boolean;
  isListening: boolean;
  begin: () => void;
  finish: () => void;
  cancel: () => void;
}

export function useAutoListen({
  enabled,
  shouldOpen,
  isListening,
  begin,
  finish,
  cancel,
}: AutoListenOptions): AutoListen {
  const endpoint = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const reopen = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const listening = React.useRef(isListening);
  listening.current = isListening;

  const clearEndpoint = React.useCallback(() => {
    if (endpoint.current === null) return;
    clearTimeout(endpoint.current);
    endpoint.current = null;
  }, []);

  const clearReopen = React.useCallback(() => {
    if (reopen.current === null) return;
    clearTimeout(reopen.current);
    reopen.current = null;
  }, []);

  React.useEffect(() => {
    if (!enabled) return;

    if (!shouldOpen) {
      clearEndpoint();
      clearReopen();
      if (listening.current) cancel();
      return;
    }

    if (listening.current || reopen.current !== null) return;

    reopen.current = setTimeout(() => {
      reopen.current = null;
      if (!listening.current) begin();
    }, SPEECH.reopenDelayMs);

    return clearReopen;
  }, [enabled, shouldOpen, begin, cancel, clearEndpoint, clearReopen]);

  const noteSpeechStart = React.useCallback(() => {
    clearEndpoint();
  }, [clearEndpoint]);

  const noteSpeechEnd = React.useCallback(() => {
    if (!enabled) return;
    clearEndpoint();
    endpoint.current = setTimeout(() => {
      endpoint.current = null;
      finish();
    }, SPEECH.endpointSilenceMs);
  }, [enabled, finish, clearEndpoint]);

  React.useEffect(
    () => () => {
      clearEndpoint();
      clearReopen();
    },
    [clearEndpoint, clearReopen],
  );

  return { isArmed: enabled && shouldOpen, noteSpeechStart, noteSpeechEnd };
}
