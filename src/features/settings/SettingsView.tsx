import { useState } from "react";
import { useTranslation } from "react-i18next";
import AccountsTab from "./AccountsTab";
import GeneralTab from "./GeneralTab";
import AppearanceTab from "./AppearanceTab";
import CloudSyncTab from "./CloudSyncTab";
import RulesTab from "./RulesTab";
import ShortcutsTab from "./ShortcutsTab";
import TranslateTab from "./TranslateTab";
import PrivacyTab from "./PrivacyTab";

const TAB_IDS = ["accounts", "general", "appearance", "privacy", "rules", "translation", "shortcuts", "cloudSync"] as const;

const TAB_LABEL_KEYS: Record<string, string> = {
  accounts: "settings.accounts",
  general: "settings.general",
  appearance: "settings.appearance",
  privacy: "settings.privacy",
  rules: "settings.rules",
  translation: "settings.translation",
  shortcuts: "settings.shortcuts",
  cloudSync: "settings.cloudSync",
};

export default function SettingsView() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState(
    () => (sessionStorage.getItem("pebble-settings-tab") as typeof TAB_IDS[number]) || "accounts",
  );

  function handleTabChange(id: typeof TAB_IDS[number]) {
    setActiveTab(id);
    sessionStorage.setItem("pebble-settings-tab", id);
  }

  return (
    <div style={{ display: "flex", height: "100%" }}>
      {/* Tab sidebar */}
      <div
        role="tablist"
        aria-label={t("settings.tabs", "Settings tabs")}
        style={{
          width: "180px",
          borderRight: "1px solid var(--color-border)",
          padding: "16px 0",
          flexShrink: 0,
        }}
      >
        {TAB_IDS.map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            onClick={() => handleTabChange(id)}
            style={{
              display: "block",
              width: "100%",
              textAlign: "left",
              padding: "8px 20px",
              border: "none",
              background: activeTab === id ? "var(--color-bg-hover)" : "none",
              color: activeTab === id ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              fontWeight: activeTab === id ? 600 : 400,
              fontSize: "13px",
              cursor: "pointer",
              borderRight: activeTab === id ? "2px solid var(--color-accent)" : "2px solid transparent",
              transition: "all 0.15s ease",
            }}
          >
            {t(TAB_LABEL_KEYS[id])}
          </button>
        ))}
      </div>
      {/* Tab content */}
      <div style={{ flex: 1, padding: "32px", maxWidth: "640px", overflow: "auto" }}>
        {activeTab === "accounts" && <AccountsTab />}
        {activeTab === "general" && <GeneralTab />}
        {activeTab === "appearance" && <AppearanceTab />}
        {activeTab === "rules" && <RulesTab />}
        {activeTab === "translation" && <TranslateTab />}
        {activeTab === "shortcuts" && <ShortcutsTab />}
        {activeTab === "privacy" && <PrivacyTab />}
        {activeTab === "cloudSync" && <CloudSyncTab />}
      </div>
    </div>
  );
}
