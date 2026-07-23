"use client";

import { Document, Conversation } from "@/lib/types";
import { DocumentList } from "./DocumentList";
import { DocumentUploadButton } from "./DocumentUploadButton";
import { ConversationList } from "./ConversationList";
import { X } from "lucide-react";

interface SidebarProps {
  documents: Document[];
  selectedDocIds: Set<string>;
  conversations: Conversation[];
  currentConversationId: string | null;
  onUploadDoc: (file: File) => Promise<void>;
  onToggleDocSelect: (docId: string) => void;
  onDeleteDoc: (docId: string) => void;
  onNewChat: () => void;
  onSelectConversation: (conversationId: string) => void;
  onDeleteConversation: (conversationId: string) => void;
  uploading: boolean;
  onClose?: () => void;
}

export function Sidebar({
  documents,
  selectedDocIds,
  conversations,
  currentConversationId,
  onUploadDoc,
  onToggleDocSelect,
  onDeleteDoc,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  uploading,
  onClose,
}: SidebarProps) {
  return (
    <div className="flex flex-col h-full w-full bg-sidebar border-r border-sidebar-border overflow-hidden">
      {/* New Chat Button */}
      <div className="p-4 border-b border-sidebar-border shrink-0 flex items-center gap-2">
        <button
          onClick={() => {
            onNewChat();
            onClose?.();
          }}
          className="flex-1 px-4 py-2 bg-sidebar-primary text-sidebar-primary-foreground font-medium rounded-md hover:bg-sidebar-primary/90 transition-colors text-sm cursor-pointer"
        >
          New Chat
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="md:hidden p-2 text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Documents Section */}
        <div className="p-4 border-b border-sidebar-border">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-sidebar-foreground mb-3">
              Documents
            </h2>
            <DocumentUploadButton onUpload={onUploadDoc} loading={uploading} />
          </div>

          <div className="mt-4">
            <DocumentList
              documents={documents}
              selectedIds={selectedDocIds}
              onToggleSelect={onToggleDocSelect}
              onDelete={onDeleteDoc}
              uploading={uploading}
            />
          </div>
        </div>

        {/* Conversations Section */}
        <div className="p-4">
          <h2 className="text-sm font-semibold text-sidebar-foreground mb-3">
            History
          </h2>
          <ConversationList
            conversations={conversations}
            currentId={currentConversationId}
            onSelect={(id) => {
              onSelectConversation(id);
              onClose?.();
            }}
            onDelete={onDeleteConversation}
          />
        </div>
      </div>
    </div>
  );
}
