"use client";

import { useState, useCallback, useRef } from "react";
import { Message, Citation } from "@/lib/types";
import { parseSSEStream } from "@/lib/sse";

import { getConversationMessages as apiGetConversationMessages } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function useChat(userId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load conversation messages from backend
  const loadConversation = useCallback(
    async (conversationId: string) => {
      if (!userId) return;

      try {
        setLoading(true);
        setError(null);
        setCurrentConversationId(conversationId);
        const msgs = await apiGetConversationMessages(userId, conversationId);
        setMessages(msgs);
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : "Failed to load conversation history";
        setError(errorMsg);
        console.error("[v0] Error loading conversation history:", err);
      } finally {
        setLoading(false);
      }
    },
    [userId]
  );

  // Send message with streaming
  const sendMessage = useCallback(
    async (
      content: string,
      conversationId: string | null,
      selectedDocIds: string[]
    ): Promise<string | null> => {
      if (!userId || !content.trim() || selectedDocIds.length === 0) {
        return null;
      }

      // Add user message optimistically
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content,
      };

      setMessages((prev) => [...prev, userMessage]);
      setLoading(true);
      setError(null);

      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(`${API_URL}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": userId,
          },
          body: JSON.stringify({
            message: content,
            conversation_id: conversationId,
            document_ids: selectedDocIds,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          let errorMsg = `HTTP ${response.status}`;
          try {
            const errorData = await response.json();
            errorMsg = errorData.detail || errorData.error_message || errorData.message || errorMsg;
          } catch {
            // response was not JSON
          }
          throw new Error(errorMsg);
        }

        let assistantContent = "";
        let citations: Citation[] = [];
        let newConversationId = conversationId;

        await parseSSEStream(
          response,
          (event) => {
            if (event.type === "conversation") {
              const convoData = event.data as { conversation_id?: string };
              if (convoData?.conversation_id) {
                newConversationId = convoData.conversation_id;
                setCurrentConversationId(newConversationId);
              }
            } else if (event.type === "token") {
              const tokenText =
                (event.data as { text?: string; token?: string })?.text ??
                (event.data as { text?: string; token?: string })?.token ??
                "";
              assistantContent += tokenText;
              // Update assistant message in real-time
              setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg?.role === "assistant" && lastMsg.id.startsWith("assistant-")) {
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMsg, content: assistantContent, citations },
                  ];
                }
                return [
                  ...prev,
                  {
                    id: `assistant-${Date.now()}`,
                    role: "assistant",
                    content: assistantContent,
                    citations,
                  },
                ];
              });
            } else if (event.type === "citations") {
              citations = Array.isArray(event.data)
                ? event.data
                : (event.data as { citations?: Citation[] })?.citations || [];
              setMessages((prev) => {
                const lastMsg = prev[prev.length - 1];
                if (lastMsg?.role === "assistant") {
                  return [
                    ...prev.slice(0, -1),
                    { ...lastMsg, citations },
                  ];
                }
                return prev;
              });
            } else if (event.type === "error") {
              const errData = event.data as { error_message?: string; detail?: string };
              throw new Error(errData?.error_message || errData?.detail || "Stream error");
            }
          },
          (error) => {
            throw error;
          }
        );

        // Add final assistant message if not already added
        setMessages((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg?.role === "assistant") {
            return prev;
          }
          return [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: "assistant",
              content: assistantContent,
              citations,
            },
          ];
        });

        return newConversationId;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          setError("Message cancelled");
        } else {
          const errorMsg = err instanceof Error ? err.message : "Failed to send message";
          setError(errorMsg);
          console.error("[v0] Chat error:", err);

          // Remove user message on error
          setMessages((prev) => prev.slice(0, -1));
        }
        return null;
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [userId]
  );

  // Clear messages and reset conversation
  const clearMessages = useCallback(() => {
    setMessages([]);
    setCurrentConversationId(null);
    setError(null);
  }, []);

  // Cancel current request
  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  return {
    messages,
    loading,
    error,
    currentConversationId,
    sendMessage,
    loadConversation,
    clearMessages,
    cancel,
  };
}
