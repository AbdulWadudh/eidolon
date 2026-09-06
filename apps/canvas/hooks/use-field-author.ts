import type { AuthorField, AuthorMode } from "@eidolon/config";
import * as React from "react";
import { tap } from "@/services/haptics";
import { authorField, contextFrom } from "@/store/author-api";
import type { Draft } from "@/store/character-draft";

export interface FieldAuthor {
  busyField: AuthorField | null;
  error: string | null;
  run: (field: AuthorField, mode: AuthorMode) => void;
  revert: (field: AuthorField) => void;
  stepsBack: (field: AuthorField) => number;
  clearError: () => void;
}

type History = Partial<Record<AuthorField, string[]>>;

/**
 * Each field keeps its own stack of what was there before, so reverting walks
 * back one version at a time to whatever the author originally typed — the same
 * contract the message rework button already has.
 */
export function useFieldAuthor(
  serverHost: string,
  draft: Draft,
  onChange: (patch: Partial<Draft>) => void,
): FieldAuthor {
  const [busyField, setBusyField] = React.useState<AuthorField | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const history = React.useRef<History>({});

  // Read inside the callback rather than closed over, so a suggestion always
  // sees what is on screen now rather than what was there when it was bound.
  const latest = React.useRef(draft);
  latest.current = draft;

  const run = React.useCallback(
    (field: AuthorField, mode: AuthorMode) => {
      if (busyField) return;

      const current = latest.current;
      const before = current[field];
      setBusyField(field);
      setError(null);

      void authorField(serverHost, field, mode, before, contextFrom(current, field)).then(
        (result) => {
          setBusyField(null);

          if (!result.text) {
            setError(result.error);
            tap("light");
            return;
          }

          history.current = {
            ...history.current,
            [field]: [...(history.current[field] ?? []), before],
          };
          onChange({ [field]: result.text } as Partial<Draft>);
          tap("success");
        },
      );
    },
    [serverHost, busyField, onChange],
  );

  const revert = React.useCallback(
    (field: AuthorField) => {
      const stack = history.current[field] ?? [];
      if (stack.length === 0) return;

      const previous = stack[stack.length - 1] ?? "";
      history.current = { ...history.current, [field]: stack.slice(0, -1) };
      onChange({ [field]: previous } as Partial<Draft>);
      setError(null);
      tap("light");
    },
    [onChange],
  );

  const stepsBack = React.useCallback(
    (field: AuthorField) => (history.current[field] ?? []).length,
    [],
  );

  const clearError = React.useCallback(() => setError(null), []);

  return { busyField, error, run, revert, stepsBack, clearError };
}
