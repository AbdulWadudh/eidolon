import * as React from "react";
import { tap } from "@/services/haptics";
import { authorQueueJobField } from "@/store/admin-api";

const AUTHORABLE = /prompt|request/i;

export interface JobAuthor {
  busyField: string | null;
  error: string | null;
  authorable: (field: string) => boolean;
  stepsBack: (field: string) => number;
  author: (
    queueKey: string,
    jobId: string,
    field: string,
    mode: "suggest" | "enhance",
    draft: string,
  ) => Promise<string | null>;
  revert: (jobId: string, field: string) => string | null;
  forget: (jobId: string) => void;
}

export function useJobAuthor(serverHost: string, token: string): JobAuthor {
  const [busyField, setBusyField] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [depth, setDepth] = React.useState<Record<string, number>>({});
  const history = React.useRef<Record<string, string[]>>({});

  const authorable = React.useCallback((field: string) => AUTHORABLE.test(field), []);

  const author = React.useCallback(
    async (
      queueKey: string,
      jobId: string,
      field: string,
      mode: "suggest" | "enhance",
      draft: string,
    ) => {
      if (busyField) return null;

      setBusyField(field);
      setError(null);

      const result = await authorQueueJobField(
        serverHost,
        token,
        queueKey,
        jobId,
        field,
        mode,
        draft,
      );
      setBusyField(null);

      if (!result.text) {
        setError(result.error);
        tap("light");
        return null;
      }

      const key = `${jobId}:${field}`;
      history.current[key] = [...(history.current[key] ?? []), draft];
      setDepth((current) => ({ ...current, [key]: history.current[key]?.length ?? 0 }));
      tap("success");

      return result.text;
    },
    [busyField, serverHost, token],
  );

  const revert = React.useCallback((jobId: string, field: string) => {
    const key = `${jobId}:${field}`;
    const stack = history.current[key];
    if (!stack || stack.length === 0) return null;

    const previous = stack[stack.length - 1] ?? "";
    history.current[key] = stack.slice(0, -1);
    setDepth((current) => ({ ...current, [key]: history.current[key]?.length ?? 0 }));
    tap("light");

    return previous;
  }, []);

  const stepsBack = React.useCallback((key: string) => depth[key] ?? 0, [depth]);

  const forget = React.useCallback((jobId: string) => {
    for (const key of Object.keys(history.current)) {
      if (key.startsWith(`${jobId}:`)) history.current[key] = [];
    }
    setDepth({});
    setError(null);
  }, []);

  return { busyField, error, authorable, stepsBack, author, revert, forget };
}
