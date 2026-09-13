import type { AuthorField, AuthorMode } from "@eidolon/config";
import * as React from "react";
import { tap } from "@/services/haptics";
import { authorField } from "@/store/author-api";

export interface TextAuthor {
  isBusy: boolean;
  run: (mode: AuthorMode, draft: string, onText: (text: string) => void) => void;
}

export function useTextAuthor(serverHost: string, field: AuthorField): TextAuthor {
  const [isBusy, setBusy] = React.useState(false);

  const run = React.useCallback(
    (mode: AuthorMode, draft: string, onText: (text: string) => void) => {
      if (isBusy || !serverHost) return;
      setBusy(true);

      void authorField(serverHost, field, mode, draft, {}).then((result) => {
        setBusy(false);
        if (!result.text) {
          tap("light");
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
