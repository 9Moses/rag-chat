"use client";

import { Conversation } from "@/lib/types";

interface ConversationListProps {
  conversations: Conversation[];
  currentId: string | null;
  onSelect: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
}

export function ConversationList({
  conversations,
  currentId,
  onSelect,
  onDelete,
}: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {conversations.map((convo) => (
        <div
          key={convo.id}
          className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors group ${
            currentId === convo.id
              ? "bg-accent text-accent-foreground"
              : "hover:bg-muted text-foreground"
          }`}
        >
          <button
            onClick={() => onSelect(convo.id)}
            className="flex-1 text-left min-w-0 truncate text-sm cursor-pointer"
          >
            {convo.title || "Untitled"}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(convo.id);
            }}
            className="opacity-0 group-hover:opacity-100 text-current hover:opacity-70 transition-all p-1 cursor-pointer"
            title="Delete conversation"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
