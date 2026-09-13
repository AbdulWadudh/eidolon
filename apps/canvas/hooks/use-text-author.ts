import { AUTHOR_COPY, type AuthorField, type AuthorMode } from "@eidolon/config";
import * as React from "react";
import { tap } from "@/services/haptics";
import { type AuthorScope, authorField } from "@/store/author-api";
import { useToastStore } from "@/store/toast-store";

export interface TextAuthor {
  isBusy: boolean;
  run: (mode: AuthorMode, draft: string, onText: (text: string) => void) => void;
}

export function useTextAuthor(
  serverHost: string,
  field: AuthorField,
  scope: AuthorScope = {},
): TextAuthor {
  const [isBusy, setBusy] = React.useState(false);
  const scopeRef = React.useRef(scope);
  scopeRef.current = scope;

  const run = React.useCallback(
    (mode: AuthorMode, draft: string, onText: (text: string) => void) => {
      if (isBusy || !serverHost) return;
      setBusy(true);

      void authorField(serverHost, field, mode, draft, {}, scopeRef.current).then((result) => {
        setBusy(false);

        if (!result.text) {
          tap("light");
          useToastStore.getState().notify(result.error ?? AUTHOR_COPY.failed, "bad");
          return;
        }

        tap("success");
        onText(result.text);
      });
    },
    [isBusy, serverHost, field],
  );

  return { isBusy, run };
}
