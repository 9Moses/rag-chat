"use client";

import { Message } from "@/lib/types";

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
          isUser
            ? "bg-accent text-accent-foreground rounded-br-none"
            : "bg-muted text-foreground rounded-bl-none"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap wrap-break-word">
          {message.content}
        </p>

        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-3 pt-3 border-t border-current border-opacity-20 space-y-1">
            <p className="text-xs font-semibold opacity-70">Sources</p>
            <div className="flex flex-wrap gap-1">
              {message.citations.map((citation, idx) => (
                <span
                  key={idx}
                  className="inline-block text-xs bg-gray-500 bg-opacity-10 px-2 py-1 rounded text-black"
                >
                  📄 {citation.filename || citation.document_name || "Document"}
                  {citation.page_number != null
                    ? ` · p. ${citation.page_number}`
                    : ""}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
