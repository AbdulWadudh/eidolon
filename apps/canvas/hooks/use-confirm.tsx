import * as React from "react";
import { AlertSheet } from "@/components/ui/alert-sheet";
import { tap } from "@/services/haptics";

export interface ConfirmRequest {
  title: string;
  body?: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
}

export interface Confirmation {
  ask: (request: ConfirmRequest) => void;
  sheet: React.ReactElement | null;
}

export function useConfirm(characterId?: string): Confirmation {
  const [pending, setPending] = React.useState<ConfirmRequest | null>(null);

  const ask = React.useCallback((request: ConfirmRequest) => {
    setPending(request);
  }, []);

  const close = React.useCallback(() => setPending(null), []);

  const confirm = React.useCallback(() => {
    if (!pending) return;
    tap(pending.isDestructive === false ? "light" : "medium");
    pending.onConfirm();
  }, [pending]);

  const sheet =
    pending === null ? null : (
      <AlertSheet
        isOpen
        characterId={characterId}
        title={pending.title}
        body={pending.body}
        confirmLabel={pending.confirmLabel}
        isDestructive={pending.isDestructive ?? true}
        onConfirm={confirm}
        onClose={close}
      />
    );

  return { ask, sheet };
}
