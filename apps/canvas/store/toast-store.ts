import { create } from "zustand";

export type ToastTone = "neutral" | "good" | "bad";

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

export interface ToastStore {
  toast: Toast | null;
  notify: (message: string, tone?: ToastTone) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set, get) => ({
  toast: null,

  notify: (message, tone = "neutral") => {
    const trimmed = message.trim();
    if (trimmed.length === 0) return;

    set({ toast: { id: crypto.randomUUID(), message: trimmed, tone } });
  },

  dismiss: (id) => {
    if (get().toast?.id !== id) return;
    set({ toast: null });
  },
}));

export function notify(message: string, tone: ToastTone = "neutral"): void {
  useToastStore.getState().notify(message, tone);
}
