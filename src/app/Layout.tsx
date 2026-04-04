import TitleBar from "../components/TitleBar";
import Sidebar from "../components/Sidebar";
import StatusBar from "../components/StatusBar";
import InboxView from "../features/inbox/InboxView";
import SettingsView from "../features/settings/SettingsView";
import CommandPalette from "../features/command-palette/CommandPalette";
import ComposeView from "../features/compose/ComposeView";
import KanbanView from "../features/kanban/KanbanView";
import { useUIStore } from "../stores/ui.store";
import { useCommandStore } from "../stores/command.store";
import { useKeyboard } from "../hooks/useKeyboard";
import { buildCommands } from "../features/command-palette/commands";
import { useEffect } from "react";

export default function Layout() {
  const { activeView } = useUIStore();
  const composeOpen = useUIStore((s) => s.composeOpen);
  const theme = useUIStore((s) => s.theme);

  useKeyboard();

  useEffect(() => {
    useCommandStore.getState().registerCommands(buildCommands());
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "system") {
      const mql = window.matchMedia("(prefers-color-scheme: dark)");
      root.setAttribute("data-theme", mql.matches ? "dark" : "light");
      const listener = (e: MediaQueryListEvent) => {
        root.setAttribute("data-theme", e.matches ? "dark" : "light");
      };
      mql.addEventListener("change", listener);
      return () => mql.removeEventListener("change", listener);
    } else {
      root.setAttribute("data-theme", theme);
    }
  }, [theme]);

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 min-h-0">
        <Sidebar />
        <main className="flex-1 min-w-0 overflow-auto">
          {activeView === "inbox" && <InboxView />}
          {activeView === "kanban" && <KanbanView />}
          {activeView === "settings" && <SettingsView />}
        </main>
      </div>
      <StatusBar />
      <CommandPalette />
      {composeOpen && <ComposeView />}
    </div>
  );
}
