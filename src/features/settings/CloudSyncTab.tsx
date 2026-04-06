import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import ConfirmDialog from "@/components/ConfirmDialog";
import {
  testWebdavConnection,
  backupToWebdav,
  restoreFromWebdav,
} from "../../lib/api";

const LAST_BACKUP_KEY = "pebble-cloud-sync-last-backup";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "12px",
  fontWeight: 500,
  color: "var(--color-text-secondary)",
  marginBottom: "4px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  fontSize: "13px",
  border: "1px solid var(--color-border)",
  borderRadius: "6px",
  background: "var(--color-bg-secondary)",
  color: "var(--color-text-primary)",
  outline: "none",
  boxSizing: "border-box",
};

const fieldGroupStyle: React.CSSProperties = {
  marginBottom: "14px",
};

const buttonStyle: React.CSSProperties = {
  padding: "8px 18px",
  fontSize: "13px",
  fontWeight: 500,
  border: "none",
  borderRadius: "6px",
  cursor: "pointer",
};

export default function CloudSyncTab() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [url, setUrl] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [statusMsg, setStatusMsg] = useState("");
  const [statusType, setStatusType] = useState<"success" | "error" | "">("");
  const [testing, setTesting] = useState(false);
  const [backing, setBacking] = useState(false);
  const [restoring, setRestoring] = useState(false);

  const [lastBackup, setLastBackup] = useState<string | null>(() =>
    localStorage.getItem(LAST_BACKUP_KEY),
  );

  async function handleTestConnection() {
    setTesting(true);
    setStatusMsg("");
    try {
      await testWebdavConnection(url, username, password);
      setStatusMsg(t("cloudSync.connectionSuccess"));
      setStatusType("success");
    } catch (err: unknown) {
      setStatusMsg(
        `${t("cloudSync.connectionFailed")}: ${err instanceof Error ? err.message : String(err)}`,
      );
      setStatusType("error");
    } finally {
      setTesting(false);
    }
  }

  async function handleBackup() {
    setBacking(true);
    setStatusMsg("");
    try {
      await backupToWebdav(url, username, password);
      const now = new Date().toLocaleString();
      localStorage.setItem(LAST_BACKUP_KEY, now);
      setLastBackup(now);
      setStatusMsg(t("cloudSync.backupSuccess"));
      setStatusType("success");
    } catch (err: unknown) {
      setStatusMsg(
        t("cloudSync.backupFailed", { error: err instanceof Error ? err.message : String(err) }),
      );
      setStatusType("error");
    } finally {
      setBacking(false);
    }
  }

  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);

  async function doRestore() {
    setRestoring(true);
    setStatusMsg("");
    try {
      await restoreFromWebdav(url, username, password);
      setStatusMsg(t("cloudSync.restoreSuccess"));
      setStatusType("success");
      // Refresh all cached data to reflect restored state
      await queryClient.invalidateQueries();
    } catch (err: unknown) {
      setStatusMsg(
        t("cloudSync.restoreFailed", { error: err instanceof Error ? err.message : String(err) }),
      );
      setStatusType("error");
    } finally {
      setRestoring(false);
    }
  }

  const anyLoading = testing || backing || restoring;

  return (
    <div>
      <h2
        style={{
          fontSize: "18px",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          marginTop: 0,
          marginBottom: "20px",
        }}
      >
        {t("cloudSync.title")}
      </h2>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>{t("cloudSync.webdavUrl")}</label>
        <input
          style={inputStyle}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://dav.example.com/remote.php/dav/files/user/"
        />
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>{t("cloudSync.username")}</label>
        <input
          style={inputStyle}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder={t("cloudSync.username")}
        />
      </div>

      <div style={fieldGroupStyle}>
        <label style={labelStyle}>{t("cloudSync.password")}</label>
        <input
          style={inputStyle}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t("cloudSync.password")}
        />
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
        <button
          style={{
            ...buttonStyle,
            background: "var(--color-bg-hover)",
            color: "var(--color-text-primary)",
            opacity: anyLoading ? 0.6 : 1,
          }}
          onClick={handleTestConnection}
          disabled={anyLoading}
        >
          {testing ? t("common.testing") : t("cloudSync.testConnection")}
        </button>
        <button
          style={{
            ...buttonStyle,
            background: "var(--color-accent)",
            color: "#fff",
            opacity: anyLoading ? 0.6 : 1,
          }}
          onClick={handleBackup}
          disabled={anyLoading}
        >
          {backing ? t("common.saving") : t("cloudSync.backup")}
        </button>
        <button
          style={{
            ...buttonStyle,
            background: "var(--color-bg-hover)",
            color: "var(--color-text-primary)",
            opacity: anyLoading ? 0.6 : 1,
          }}
          onClick={() => setShowRestoreConfirm(true)}
          disabled={anyLoading}
        >
          {restoring ? t("common.loading") : t("cloudSync.restore")}
        </button>
      </div>

      {/* Restore confirmation */}
      {showRestoreConfirm && (
        <ConfirmDialog
          title={t("cloudSync.restore")}
          message={t("cloudSync.restoreConfirm", "This will overwrite your local data with the cloud backup. Continue?")}
          destructive
          onCancel={() => setShowRestoreConfirm(false)}
          onConfirm={() => {
            setShowRestoreConfirm(false);
            doRestore();
          }}
        />
      )}

      {/* Last backup timestamp */}
      {lastBackup && (
        <div
          style={{
            marginTop: "14px",
            fontSize: "12px",
            color: "var(--color-text-secondary)",
          }}
        >
          {t("cloudSync.lastBackup")}: {lastBackup}
        </div>
      )}

      {/* Status message */}
      {statusMsg && (
        <div
          style={{
            marginTop: "14px",
            padding: "10px 14px",
            borderRadius: "6px",
            fontSize: "13px",
            background:
              statusType === "success"
                ? "var(--color-bg-hover)"
                : "rgba(220, 53, 69, 0.1)",
            color:
              statusType === "success"
                ? "var(--color-text-primary)"
                : "#dc3545",
            border: `1px solid ${statusType === "success" ? "var(--color-border)" : "rgba(220, 53, 69, 0.3)"}`,
          }}
        >
          {statusMsg}
        </div>
      )}
    </div>
  );
}
