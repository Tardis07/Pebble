import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { Message } from "@/lib/api";
import MessageItem from "./MessageItem";

interface Props {
  messages: Message[];
  selectedMessageId: string | null;
  onSelectMessage: (id: string) => void;
  loading: boolean;
}

export default function MessageList({
  messages,
  selectedMessageId,
  onSelectMessage,
  loading,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 76,
  });

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

  if (messages.length === 0) {
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
        No messages
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      style={{
        height: "100%",
        overflow: "auto",
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const message = messages[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <MessageItem
                message={message}
                isSelected={message.id === selectedMessageId}
                onClick={() => onSelectMessage(message.id)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
