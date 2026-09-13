import { create } from "zustand";
import { appStorage } from "@/store/storage";

const EDIT_ANY_KEY = "eidolon.admin.edit_any_message";
const SPEAK_ANY_KEY = "eidolon.admin.speak_any_message";

export interface AdminState {
  canEditAnyMessage: boolean;
  canSpeakAnyMessage: boolean;
  setEditAnyMessage: (enabled: boolean) => void;
  setSpeakAnyMessage: (enabled: boolean) => void;
}

export const useAdminStore = create<AdminState>((set) => ({
  canEditAnyMessage: appStorage.getBoolean(EDIT_ANY_KEY) ?? false,
  canSpeakAnyMessage: appStorage.getBoolean(SPEAK_ANY_KEY) ?? true,

  setEditAnyMessage: (enabled) => {
    appStorage.set(EDIT_ANY_KEY, enabled);
    set({ canEditAnyMessage: enabled });
  },

  setSpeakAnyMessage: (enabled) => {
    appStorage.set(SPEAK_ANY_KEY, enabled);
    set({ canSpeakAnyMessage: enabled });
  },
}));
