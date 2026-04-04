import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Languages, Reply, Forward, Star, Archive, Trash2, LayoutGrid } from "lucide-react";
import { getMessage, getRenderedHtml, updateMessageFlags, moveToKanban, translateText } from "@/lib/api";
import { useUIStore } from "@/stores/ui.store";
import { useTranslation } from "react-i18next";
import type { Message, RenderedHtml, PrivacyMode, TranslateResult } from "@/lib/api";
import { MessageDetailSkeleton } from "./Skeleton";
import PrivacyBanner from "./PrivacyBanner";
import AttachmentList from "./AttachmentList";
import SnoozePopover from "../features/inbox/SnoozePopover";
import TranslatePopover from "../features/translate/TranslatePopover";
import BilingualView from "../features/translate/BilingualView";

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
  const { t } = useTranslation();
  const openCompose = useUIStore((s) => s.openCompose);
  const [message, setMessage] = useState<Message | null>(null);
  const [rendered, setRendered] = useState<RenderedHtml | null>(null);
  const [loading, setLoading] = useState(true);
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>("Strict");
  const [showSnooze, setShowSnooze] = useState(false);
  const [showTranslate, setShowTranslate] = useState<{ text: string; position: { x: number; y: number } } | null>(null);
  const [bilingualMode, setBilingualMode] = useState(false);
  const [bilingualResult, setBilingualResult] = useState<TranslateResult | null>(null);
  const [bilingualLoading, setBilingualLoading] = useState(false);

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

  useEffect(() => {
    if (!showTranslate) return;
    function handleClick() {
      setShowTranslate(null);
    }
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [showTranslate]);

  function handleLoadImages() {
    setPrivacyMode("LoadOnce");
  }

  function handleTrustSender() {
    if (message) {
      setPrivacyMode({ TrustSender: message.from_address });
    }
  }

  async function handleBilingualToggle() {
    if (bilingualMode) {
      setBilingualMode(false);
      return;
    }
    if (!message) return;
    setBilingualMode(true);
    setBilingualLoading(true);
    try {
      const result = await translateText(message.body_text || "", "auto", "zh");
      setBilingualResult(result);
    } catch (err) {
      console.error("Translation failed:", err);
    } finally {
      setBilingualLoading(false);
    }
  }

  function handleMouseUp(e: React.MouseEvent) {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || "";
    if (selectedText.length > 5) {
      setShowTranslate({ text: selectedText, position: { x: e.clientX, y: e.clientY } });
    }
  }

  if (loading) {
    return <MessageDetailSkeleton />;
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
          <button
            onClick={handleBilingualToggle}
            style={{
              background: bilingualMode ? "var(--color-bg-hover)" : "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              color: bilingualMode ? "var(--color-accent)" : "var(--color-text-secondary)",
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
            }}
            title="Toggle bilingual view"
          >
            <Languages size={16} />
          </button>
        </div>
        {/* Action Toolbar */}
        <div style={{ display: "flex", gap: "2px", padding: "4px 16px 4px 48px" }}>
          {([
            { icon: Reply, label: t("messageActions.reply"), action: () => openCompose("reply", message) },
            { icon: Forward, label: t("messageActions.forward"), action: () => openCompose("forward", message) },
            {
              icon: Star,
              label: message.is_starred ? t("messageActions.unstar") : t("messageActions.star"),
              action: async () => {
                await updateMessageFlags(message.id, undefined, !message.is_starred);
                setMessage({ ...message, is_starred: !message.is_starred });
              },
              active: message.is_starred,
            },
            {
              icon: Archive,
              label: t("messageActions.archive"),
              action: async () => {
                // archive action placeholder
                onBack();
              },
            },
            {
              icon: Trash2,
              label: t("messageActions.delete"),
              action: async () => {
                // delete action placeholder
                onBack();
              },
            },
            { icon: LayoutGrid, label: t("messageActions.addToKanban"), action: () => moveToKanban(message.id, "todo") },
          ] as const).map(({ icon: Icon, label, action, active }: { icon: React.ComponentType<{ size?: number }>; label: string; action: () => void; active?: boolean }, i) => (
            <button
              key={i}
              onClick={action}
              title={label}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "6px 8px",
                borderRadius: "4px",
                color: active ? "var(--color-accent)" : "var(--color-text-secondary)",
                display: "flex",
                alignItems: "center",
                transition: "background-color 0.12s ease, color 0.12s ease",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--color-bg-hover)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
            >
              <Icon size={16} />
            </button>
          ))}
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
      <div style={{ flex: 1, overflow: "auto", padding: "16px" }} onMouseUp={handleMouseUp}>
        {bilingualMode ? (
          bilingualLoading ? (
            <div style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>Translating...</div>
          ) : bilingualResult ? (
            <BilingualView segments={bilingualResult.segments} />
          ) : (
            <div style={{ fontSize: "13px", color: "var(--color-text-secondary)" }}>Translation failed</div>
          )
        ) : rendered && rendered.html ? (
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

      {/* Attachments */}
      {message.has_attachments && <AttachmentList messageId={message.id} />}

      {showTranslate && (
        <TranslatePopover
          text={showTranslate.text}
          position={showTranslate.position}
          onClose={() => setShowTranslate(null)}
        />
      )}
    </div>
  );
}
