import { useEffect, useState } from "react";
import { ArrowLeft, Clock } from "lucide-react";
import { getMessage, getRenderedHtml, updateMessageFlags } from "@/lib/api";
import type { Message, RenderedHtml, PrivacyMode } from "@/lib/api";
import PrivacyBanner from "./PrivacyBanner";
import SnoozePopover from "../features/inbox/SnoozePopover";

interface Props {
  messageId: string;
  onBack: () => void;
}

function formatFullDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function MessageDetail({ messageId, onBack }: Props) {
  const [message, setMessage] = useState<Message | null>(null);
  const [rendered, setRendered] = useState<RenderedHtml | null>(null);
  const [loading, setLoading] = useState(true);
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>("Strict");
  const [showSnooze, setShowSnooze] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessage(null);
    setRendered(null);

    async function load() {
      try {
        const msg = await getMessage(messageId);
        if (cancelled || !msg) return;
        setMessage(msg);

        if (!msg.is_read) {
          updateMessageFlags(messageId, true, undefined).catch(() => {});
        }

        const html = await getRenderedHtml(messageId, privacyMode);
        if (!cancelled) {
          setRendered(html);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [messageId, privacyMode]);

  useEffect(() => {
    if (!showSnooze) return;
    function handleClick() {
      setShowSnooze(false);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showSnooze]);

  function handleLoadImages() {
    setPrivacyMode("LoadOnce");
  }

  function handleTrustSender() {
    if (message) {
      setPrivacyMode({ TrustSender: message.from_address });
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--color-text-secondary)",
          fontSize: "14px",
        }}
      >
        Loading...
      </div>
    );
  }

  if (!message) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "var(--color-text-secondary)",
          fontSize: "14px",
        }}
      >
        Message not found
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "var(--color-bg)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--color-border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
          <button
            onClick={onBack}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              color: "var(--color-text-secondary)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <h2
            style={{
              fontSize: "15px",
              fontWeight: "600",
              color: "var(--color-text-primary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              margin: 0,
            }}
          >
            {message.subject || "(no subject)"}
          </h2>
          <div style={{ position: "relative", marginLeft: "auto", flexShrink: 0 }}>
            <button
              onClick={() => setShowSnooze(!showSnooze)}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "4px",
                color: "var(--color-text-secondary)",
                display: "flex",
                alignItems: "center",
              }}
              title="Snooze message"
            >
              <Clock size={16} />
            </button>
            {showSnooze && (
              <SnoozePopover
                messageId={messageId}
                onClose={() => setShowSnooze(false)}
                onSnoozed={() => {
                  setShowSnooze(false);
                  onBack();
                }}
              />
            )}
          </div>
        </div>
        <div style={{ paddingLeft: "32px" }}>
          <div style={{ fontSize: "13px", color: "var(--color-text-primary)", marginBottom: "2px" }}>
            <span style={{ fontWeight: "500" }}>
              {message.from_name || message.from_address}
            </span>
            {message.from_name && (
              <span style={{ color: "var(--color-text-secondary)", marginLeft: "6px" }}>
                &lt;{message.from_address}&gt;
              </span>
            )}
          </div>
          <div style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
            {formatFullDate(message.date)}
          </div>
        </div>
      </div>

      {/* Privacy Banner */}
      {rendered && (
        <PrivacyBanner
          rendered={rendered}
          onLoadImages={handleLoadImages}
          onTrustSender={handleTrustSender}
        />
      )}

      {/* Body */}
      <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
        {rendered && rendered.html ? (
          <div
            dangerouslySetInnerHTML={{ __html: rendered.html }}
            style={{ fontSize: "14px", color: "var(--color-text-primary)" }}
          />
        ) : (
          <pre
            style={{
              fontSize: "13px",
              color: "var(--color-text-primary)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              margin: 0,
              fontFamily: "inherit",
            }}
          >
            {message.body_text}
          </pre>
        )}
      </div>
    </div>
  );
}
