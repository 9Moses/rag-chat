"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";

interface ChatPanelProps {
  messages: Message[];
  loading: boolean;
  error: string | null;
  onSendMessage: (message: string) => void;
  hasSelectedDocs: boolean;
}

export function ChatPanel({
  messages,
  loading,
  error,
  onSendMessage,
  hasSelectedDocs,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScroll = useRef(true);

  useEffect(() => {
    if (shouldAutoScroll.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      shouldAutoScroll.current = scrollHeight - scrollTop - clientHeight < 100;
    }
  };

  const isEmpty = messages.length === 0;
  const disabledReason = !hasSelectedDocs
    ? "Select at least one document to get started"
    : undefined;

  return (
    <div className="flex-1 flex flex-col h-full bg-background min-h-0 min-w-0">
      {/* Messages Area */}
      <div
        ref={chatContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {isEmpty && (
          <div className="h-full flex flex-col items-center justify-center px-4">
            <div className="text-center max-w-md">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Chat with Your Documents
              </h2>
              <p className="text-muted-foreground text-sm">
                Upload a PDF document from the left sidebar, then ask any question. 
                We&apos;ll search the document and give you the answer.
              </p>
            </div>
          </div>
        )}

        {!isEmpty && (
          <div className="p-4 space-y-4">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Active Documents Indicator */}
      {!isEmpty && hasSelectedDocs && (
        <div className="px-4 py-2 border-t border-border bg-muted/50 flex gap-2 flex-wrap">
          {/* Placeholder for active docs pills */}
        </div>
      )}

      {/* Input Area */}
      <ChatInput
        onSend={onSendMessage}
        disabled={!hasSelectedDocs}
        loading={loading}
        disabledReason={disabledReason}
      />
    </div>
  );
}
