import { create } from "zustand";

interface MailState {
  // ─── UI State ──────────────────────────────────────────────────────────────
  activeAccountId: string | null;
  activeFolderId: string | null;
  selectedMessageId: string | null;
  selectedThreadId: string | null;
  threadView: boolean;

  setActiveAccountId: (accountId: string | null) => void;
  setActiveFolderId: (folderId: string | null) => void;
  setSelectedMessage: (messageId: string | null) => void;
  setSelectedThreadId: (threadId: string | null) => void;
  toggleThreadView: () => void;
}

export const useMailStore = create<MailState>((set, get) => ({
  activeAccountId: null,
  activeFolderId: null,
  selectedMessageId: null,
  selectedThreadId: null,
  threadView: false,

  setActiveAccountId: (accountId) => {
    set({
      activeAccountId: accountId,
      activeFolderId: null,
      selectedMessageId: null,
      selectedThreadId: null,
    });
  },

  setActiveFolderId: (folderId) => {
    set({
      activeFolderId: folderId,
      selectedMessageId: null,
      selectedThreadId: null,
    });
  },

  setSelectedMessage: (messageId) => {
    set({ selectedMessageId: messageId });
  },

  setSelectedThreadId: (threadId) => {
    set({ selectedThreadId: threadId });
  },

  toggleThreadView: () => {
    set({
      threadView: !get().threadView,
      selectedThreadId: null,
      selectedMessageId: null,
    });
  },
}));
