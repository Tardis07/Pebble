import { useEffect } from "react";
import {
  Inbox,
  Send,
  FileEdit,
  Trash2,
  Archive,
  AlertTriangle,
  Folder,
  LayoutGrid,
  Settings,
} from "lucide-react";
import { useUIStore } from "../stores/ui.store";
import { useMailStore } from "../stores/mail.store";
import type { Folder as FolderType } from "../lib/api";

function folderIcon(role: FolderType["role"]): React.ReactNode {
  switch (role) {
    case "inbox":
      return <Inbox size={16} />;
    case "sent":
      return <Send size={16} />;
    case "drafts":
      return <FileEdit size={16} />;
    case "trash":
      return <Trash2 size={16} />;
    case "archive":
      return <Archive size={16} />;
    case "spam":
      return <AlertTriangle size={16} />;
    default:
      return <Folder size={16} />;
  }
}

export default function Sidebar() {
  const { activeView, setActiveView, sidebarCollapsed } = useUIStore();
  const {
    folders,
    activeFolderId,
    setActiveFolder,
    accounts,
    activeAccountId,
    fetchAccounts,
    setActiveAccount,
  } = useMailStore();

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  useEffect(() => {
    if (accounts.length > 0 && !activeAccountId) {
      setActiveAccount(accounts[0].id);
    }
  }, [accounts, activeAccountId, setActiveAccount]);

  function handleFolderClick(folderId: string) {
    setActiveView("inbox");
    setActiveFolder(folderId);
  }

  const buttonBase: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    borderRadius: "6px",
    padding: sidebarCollapsed ? "7px" : "6px 10px",
    width: "100%",
    border: "none",
    cursor: "pointer",
    fontSize: "13px",
    textAlign: "left",
    justifyContent: sidebarCollapsed ? "center" : "flex-start",
  };

  return (
    <aside
      style={{
        width: sidebarCollapsed ? "48px" : "200px",
        backgroundColor: "var(--color-sidebar-bg)",
        borderRight: "1px solid var(--color-border)",
        transition: "width 150ms ease",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Folders section */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px 6px",
          display: "flex",
          flexDirection: "column",
          gap: "1px",
        }}
      >
        {folders.map((folder) => {
          const isActive = folder.id === activeFolderId && activeView === "inbox";
          return (
            <button
              key={folder.id}
              onClick={() => handleFolderClick(folder.id)}
              title={sidebarCollapsed ? folder.name : undefined}
              style={{
                ...buttonBase,
                backgroundColor: isActive
                  ? "var(--color-sidebar-active)"
                  : "transparent",
                color: "var(--color-text-primary)",
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  e.currentTarget.style.backgroundColor = "var(--color-sidebar-hover)";
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {folderIcon(folder.role)}
              {!sidebarCollapsed && (
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {folder.name}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div
        style={{
          height: "1px",
          backgroundColor: "var(--color-border)",
          margin: "0 6px",
        }}
      />

      {/* Bottom nav: Kanban + Settings */}
      <nav
        style={{
          padding: "6px 6px 8px",
          display: "flex",
          flexDirection: "column",
          gap: "1px",
        }}
      >
        {([
          { id: "kanban" as const, label: "Kanban", icon: <LayoutGrid size={16} /> },
          { id: "settings" as const, label: "Settings", icon: <Settings size={16} /> },
        ]).map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              title={sidebarCollapsed ? item.label : undefined}
              style={{
                ...buttonBase,
                backgroundColor: isActive
                  ? "var(--color-sidebar-active)"
                  : "transparent",
                color: "var(--color-text-primary)",
              }}
              onMouseEnter={(e) => {
                if (!isActive)
                  e.currentTarget.style.backgroundColor = "var(--color-sidebar-hover)";
              }}
              onMouseLeave={(e) => {
                if (!isActive)
                  e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              {item.icon}
              {!sidebarCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
