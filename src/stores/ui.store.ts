import { create } from "zustand";
import type { Message } from "@/lib/api";

export type ActiveView = "inbox" | "kanban" | "settings" | "search";
export type Theme = "light" | "dark" | "system";
export type Language = "en" | "zh";
export type NetworkStatus = "online" | "offline";

interface UIState {
  sidebarCollapsed: boolean;
  activeView: ActiveView;
  theme: Theme;
  language: Language;
  syncStatus: "idle" | "syncing" | "error";
  networkStatus: NetworkStatus;
  lastMailError: string | null;
  composeOpen: boolean;
  composeMode: "new" | "reply" | "forward" | null;
  composeReplyTo: Message | null;
  toggleSidebar: () => void;
  setActiveView: (view: ActiveView) => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
  setSyncStatus: (status: "idle" | "syncing" | "error") => void;
  setNetworkStatus: (status: NetworkStatus) => void;
  setLastMailError: (error: string | null) => void;
  openCompose: (mode: "new" | "reply" | "forward", replyTo?: Message | null) => void;
  closeCompose: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activeView: "inbox",
  theme: "light",
  language: (localStorage.getItem("pebble-language") as Language) || "en",
  syncStatus: "idle",
  networkStatus: "online",
  lastMailError: null,
  composeOpen: false,
  composeMode: null,
  composeReplyTo: null,
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setActiveView: (view) => set({ activeView: view }),
  setTheme: (theme) => set({ theme }),
  setLanguage: (lang) => {
    import("@/lib/i18n").then((mod) => mod.default.changeLanguage(lang));
    localStorage.setItem("pebble-language", lang);
    set({ language: lang });
  },
  setSyncStatus: (status) => set({ syncStatus: status }),
  setNetworkStatus: (status) => set({ networkStatus: status }),
  setLastMailError: (error) => set({ lastMailError: error }),
  openCompose: (mode, replyTo = null) =>
    set({ composeOpen: true, composeMode: mode, composeReplyTo: replyTo }),
  closeCompose: () =>
    set({ composeOpen: false, composeMode: null, composeReplyTo: null }),
  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
