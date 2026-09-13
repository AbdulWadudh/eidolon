import { create } from "zustand";

export type ToastTone = "neutral" | "good" | "bad";

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
  sticky?: boolean;
}

export interface ToastStore {
  toast: Toast | null;
  notify: (message: string, tone?: ToastTone) => void;
  hold: (id: string, message: string, tone?: ToastTone) => void;
  release: (id: string) => void;
  dismiss: (id: string) => void;
}

let raised = 0;

export const useToastStore = create<ToastStore>((set, get) => ({
  toast: null,

  notify: (message, tone = "neutral") => {
    const trimmed = message.trim();
    if (trimmed.length === 0) return;

    raised += 1;
    set({ toast: { id: String(raised), message: trimmed, tone } });
  },

  hold: (id, message, tone = "neutral") => {
    const trimmed = message.trim();
    if (trimmed.length === 0) return;

    set({ toast: { id, message: trimmed, tone, sticky: true } });
  },

  release: (id) => {
    if (get().toast?.id !== id) return;
    set({ toast: null });
  },

  dismiss: (id) => {
    if (get().toast?.id !== id) return;
    set({ toast: null });
  },
}));

export function notify(message: string, tone: ToastTone = "neutral"): void {
  useToastStore.getState().notify(message, tone);
}
