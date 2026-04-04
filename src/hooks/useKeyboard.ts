import { useEffect } from "react";
import { useCommandStore } from "@/stores/command.store";
import { useUIStore } from "@/stores/ui.store";
import { useMailStore } from "@/stores/mail.store";
import { updateMessageFlags } from "@/lib/api";

export function useKeyboard() {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Ctrl/Cmd+K — always open command palette (but not Ctrl+Shift+K which is Kanban)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        useCommandStore.getState().open();
        return;
      }

      // Don't handle single-key shortcuts when typing in inputs
      if (isInput) return;

      // Escape — close any modal
      if (e.key === "Escape") {
        if (useCommandStore.getState().isOpen) {
          useCommandStore.getState().close();
        }
        return;
      }

      // Navigation shortcuts
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "I") {
        e.preventDefault();
        useUIStore.getState().setActiveView("inbox");
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "K") {
        e.preventDefault();
        useUIStore.getState().setActiveView("kanban");
        return;
      }

      // Single-key shortcuts (only when not in input)
      const { selectedMessageId, messages } = useMailStore.getState();

      if (e.key === "s" && selectedMessageId) {
        const msg = messages.find((m) => m.id === selectedMessageId);
        if (msg) updateMessageFlags(selectedMessageId, undefined, !msg.is_starred);
        return;
      }

      if (e.key === "j") {
        // Next message
        const idx = messages.findIndex((m) => m.id === selectedMessageId);
        if (idx < messages.length - 1) {
          useMailStore.getState().setSelectedMessage(messages[idx + 1].id);
        }
        return;
      }

      if (e.key === "k") {
        // Previous message
        const idx = messages.findIndex((m) => m.id === selectedMessageId);
        if (idx > 0) {
          useMailStore.getState().setSelectedMessage(messages[idx - 1].id);
        }
        return;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
}
