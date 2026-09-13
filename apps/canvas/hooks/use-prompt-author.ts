import type { AuthorMode } from "@eidolon/config";
import * as React from "react";
import { tap } from "@/services/haptics";
import { authorPrompt } from "@/store/admin-api";

export interface PromptAuthor {
  busyKey: string | null;
  error: string | null;
  run: (key: string, mode: AuthorMode, draft: string) => void;
  revert: (key: string) => void;
  stepsBack: (key: string) => number;
  forget: (key: string) => void;
  clearError: () => void;
}

export function usePromptAuthor(
  serverHost: string,
  token: string,
  onWritten: (key: string, text: string) => void,
): PromptAuthor {
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [depth, setDepth] = React.useState<Record<string, number>>({});
  const history = React.useRef<Record<string, string[]>>({});

  const run = React.useCallback(
    (key: string, mode: AuthorMode, draft: string) => {
      if (busyKey) return;

      setBusyKey(key);
      setError(null);

      void authorPrompt(serverHost, token, key, mode, draft).then((result) => {
        setBusyKey(null);

        if (!result.text) {
          setError(result.error);
          tap("light");
          return;
        }

        history.current[key] = [...(history.current[key] ?? []), draft];
        setDepth((current) => ({ ...current, [key]: history.current[key]?.length ?? 0 }));
        onWritten(key, result.text);
        tap("success");
      });
    },
    [busyKey, onWritten, serverHost, token],
  );

  const revert = React.useCallback(
    (key: string) => {
      const stack = history.current[key];
      if (!stack || stack.length === 0) return;

      const previous = stack[stack.length - 1] ?? "";
      history.current[key] = stack.slice(0, -1);
      setDepth((current) => ({ ...current, [key]: history.current[key]?.length ?? 0 }));
      onWritten(key, previous);
      tap("light");
    },
    [onWritten],
  );

  const stepsBack = React.useCallback((key: string) => depth[key] ?? 0, [depth]);

  const forget = React.useCallback((key: string) => {
    history.current[key] = [];
    setDepth((current) => ({ ...current, [key]: 0 }));
  }, []);

  const clearError = React.useCallback(() => setError(null), []);

  return { busyKey, error, run, revert, stepsBack, forget, clearError };
}
