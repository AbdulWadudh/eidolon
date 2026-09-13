import type { AuthorField, AuthorMode } from "@eidolon/config";
import * as React from "react";
import { tap } from "@/services/haptics";
import { type AuthorScope, authorField, contextFrom } from "@/store/author-api";
export type AuthoredDraft = Record<string, string>;

export interface FieldAuthor<K extends string = string> {
  busyField: string | null;
  error: string | null;
  run: (field: K, mode: AuthorMode) => void;
  revert: (field: K) => void;
  stepsBack: (field: K) => number;
  clearError: () => void;
}

type History = Record<string, string[]>;

export function useFieldAuthor<T extends AuthoredDraft>(
  serverHost: string,
  draft: T,
  onChange: (patch: Partial<T>) => void,
  scope: AuthorScope = {},
): FieldAuthor<AuthorField & keyof T & string> {
  type K = AuthorField & keyof T & string;
  const [busyField, setBusyField] = React.useState<K | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const history = React.useRef<History>({});

  const latest = React.useRef(draft);
  latest.current = draft;
  const scopeRef = React.useRef(scope);
  scopeRef.current = scope;

  const run = React.useCallback(
    (field: K, mode: AuthorMode) => {
      if (busyField) return;

      const current = latest.current;
      const before = current[field] as string;
      setBusyField(field);
      setError(null);

      void authorField(
        serverHost,
        field,
        mode,
        before,
        contextFrom(current, field),
        scopeRef.current,
      ).then((result) => {
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
        onChange({ [field]: result.text } as Partial<T>);
        tap("success");
      });
    },
    [serverHost, busyField, onChange],
  );

  const revert = React.useCallback(
    (field: K) => {
      const stack = history.current[field] ?? [];
      if (stack.length === 0) return;

      const previous = stack[stack.length - 1] ?? "";
      history.current = { ...history.current, [field]: stack.slice(0, -1) };
      onChange({ [field]: previous } as Partial<T>);
      setError(null);
      tap("light");
    },
    [onChange],
  );

  const stepsBack = React.useCallback((field: K) => (history.current[field] ?? []).length, []);

  const clearError = React.useCallback(() => setError(null), []);

  return { busyField, error, run, revert, stepsBack, clearError };
}
