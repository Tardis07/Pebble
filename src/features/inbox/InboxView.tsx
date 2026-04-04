import { useMessages } from "@/hooks/useMessages";
import { useSearch } from "@/hooks/useSearch";
import MessageList from "@/components/MessageList";
import MessageDetail from "@/components/MessageDetail";
import SearchBar from "@/components/SearchBar";

export default function InboxView() {
  const { messages, loading, selectedMessageId, setSelectedMessage } = useMessages();
  const { search, clear } = useSearch();

  const detailOpen = selectedMessageId !== null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      <SearchBar onSearch={search} onClear={clear} />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Message list */}
        <div
          style={{
            width: detailOpen ? "360px" : "100%",
            flexShrink: 0,
            borderRight: detailOpen ? "1px solid var(--color-border)" : "none",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <MessageList
            messages={messages}
            selectedMessageId={selectedMessageId}
            onSelectMessage={(id) => setSelectedMessage(id)}
            loading={loading}
          />
        </div>

        {/* Message detail */}
        {detailOpen && (
          <div style={{ flex: 1, overflow: "hidden" }}>
            <MessageDetail
              messageId={selectedMessageId}
              onBack={() => setSelectedMessage(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
