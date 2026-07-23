"use client";

import { useState, useRef } from "react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  loading: boolean;
  disabledReason?: string;
}

export function ChatInput({ onSend, disabled, loading, disabledReason }: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || disabled || loading) return;

    // Check for CJK IME composition
    if ((e as any).nativeEvent?.isComposing) return;

    onSend(message);
    setMessage("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Check for CJK IME and Safari composition
    if ((e as any).nativeEvent?.isComposing || e.keyCode === 229) return;

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-background">
      <div className="p-4">
        {disabledReason && (
          <p className="text-xs text-muted-foreground mb-3 px-3 py-2 bg-muted rounded">
            {disabledReason}
          </p>
        )}

        <div className="flex gap-3">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={disabled || loading}
            placeholder={disabled ? "No documents selected" : "Ask a question..."}
            rows={1}
            className="flex-1 px-3 py-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50 resize-none"
          />
          <button
            type="submit"
            disabled={disabled || loading || !message.trim()}
            className="px-4 py-2 bg-accent text-accent-foreground font-medium rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors self-end"
          >
            {loading ? "..." : "Send"}
          </button>
        </div>
      </div>
    </form>
  );
}
