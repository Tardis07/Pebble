import { describe, it, expect, beforeEach } from "vitest";
import { useUIStore } from "../../src/stores/ui.store";

describe("UIStore", () => {
  beforeEach(() => {
    useUIStore.setState({
      sidebarCollapsed: false,
      activeView: "inbox",
      theme: "light",
      syncStatus: "idle",
    });
  });

  it("should have correct initial state", () => {
    const state = useUIStore.getState();
    expect(state.sidebarCollapsed).toBe(false);
    expect(state.activeView).toBe("inbox");
    expect(state.theme).toBe("light");
    expect(state.syncStatus).toBe("idle");
  });

  it("should toggle sidebar", () => {
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(true);
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarCollapsed).toBe(false);
  });

  it("should set active view", () => {
    useUIStore.getState().setActiveView("kanban");
    expect(useUIStore.getState().activeView).toBe("kanban");
    useUIStore.getState().setActiveView("settings");
    expect(useUIStore.getState().activeView).toBe("settings");
  });

  it("should set theme", () => {
    useUIStore.getState().setTheme("dark");
    expect(useUIStore.getState().theme).toBe("dark");
  });

  it("should set sync status", () => {
    useUIStore.getState().setSyncStatus("syncing");
    expect(useUIStore.getState().syncStatus).toBe("syncing");
    useUIStore.getState().setSyncStatus("error");
    expect(useUIStore.getState().syncStatus).toBe("error");
  });
});
