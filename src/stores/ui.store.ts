import { create } from "zustand";
import type { Message } from "@/lib/api";

export type ActiveView = "inbox" | "kanban" | "settings" | "search" | "snoozed" | "starred" | "compose";
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
  previousView: ActiveView;
  composeMode: "new" | "reply" | "reply-all" | "forward" | null;
  composeReplyTo: Message | null;
  composeDirty: boolean;
  setComposeDirty: (dirty: boolean) => void;
  toggleSidebar: () => void;
  setActiveView: (view: ActiveView) => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
  setSyncStatus: (status: "idle" | "syncing" | "error") => void;
  setNetworkStatus: (status: NetworkStatus) => void;
  setLastMailError: (error: string | null) => void;
  openCompose: (mode: "new" | "reply" | "reply-all" | "forward", replyTo?: Message | null) => void;
  closeCompose: () => void;
  pollInterval: number;
  setPollInterval: (secs: number) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  activeView: "inbox",
  theme: (localStorage.getItem("pebble-theme") as Theme) || "light",
  language: (localStorage.getItem("pebble-language") as Language) || "en",
  syncStatus: "idle",
  networkStatus: "online",
  lastMailError: null,
  previousView: "inbox",
  composeMode: null,
  composeReplyTo: null,
  composeDirty: false,
  setComposeDirty: (dirty) => set({ composeDirty: dirty }),
  toggleSidebar: () =>
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setActiveView: (view) => {
    const state = useUIStore.getState();
    // Guard: if leaving compose with unsaved content, confirm first
    if (state.activeView === "compose" && state.composeDirty && view !== "compose") {
      // eslint-disable-next-line no-restricted-globals
      if (!confirm("You have an unsaved draft. Discard and leave?")) return;
    }
    set({ activeView: view, ...(state.activeView === "compose" ? { composeDirty: false } : {}) });
  },
  setTheme: (theme) => {
    localStorage.setItem("pebble-theme", theme);
    set({ theme });
  },
  setLanguage: (lang) => {
    import("@/lib/i18n").then((mod) => mod.default.changeLanguage(lang));
    localStorage.setItem("pebble-language", lang);
    set({ language: lang });
  },
  setSyncStatus: (status) => set({ syncStatus: status }),
  setNetworkStatus: (status) => set({ networkStatus: status }),
  setLastMailError: (error) => set({ lastMailError: error }),
  openCompose: (mode, replyTo = null) =>
    set((state) => ({
      previousView: state.activeView === "compose" ? state.previousView : state.activeView,
      activeView: "compose" as ActiveView,
      composeMode: mode,
      composeReplyTo: replyTo,
    })),
  closeCompose: () =>
    set((state) => ({
      activeView: state.previousView,
      composeMode: null,
      composeReplyTo: null,
      composeDirty: false,
    })),
  pollInterval: Number(localStorage.getItem("pebble-poll-interval")) || 15,
  setPollInterval: (secs) => {
    localStorage.setItem("pebble-poll-interval", String(secs));
    set({ pollInterval: secs });
  },
  searchQuery: "",
  setSearchQuery: (q) => set({ searchQuery: q }),
}));
