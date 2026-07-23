"use client";

import { useState, useCallback, useEffect } from "react";
import { Conversation } from "@/lib/types";
import {
  getConversations as apiGetConversations,
  deleteConversation as apiDeleteConversation,
} from "@/lib/api";

export function useConversations(userId: string | null) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const convos = await apiGetConversations(userId);
      setConversations(convos);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load conversations");
      console.error("[v0] Error fetching conversations:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Create or add new conversation (optimistic UI)
  const addConversation = useCallback((conversation: Conversation) => {
    setConversations((prev) => {
      const exists = prev.some((c) => c.id === conversation.id);
      if (exists) return prev;
      return [conversation, ...prev];
    });
    setCurrentConversationId(conversation.id);
  }, []);

  // Delete conversation
  const deleteConvo = useCallback(
    async (conversationId: string) => {
      if (!userId) return;

      try {
        setError(null);
        await apiDeleteConversation(userId, conversationId);
        setConversations((prev) => prev.filter((c) => c.id !== conversationId));
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
        throw err;
      }
    },
    [userId, currentConversationId]
  );

  // New conversation (clear state)
  const newConversation = useCallback(() => {
    setCurrentConversationId(null);
  }, []);

  return {
    conversations,
    currentConversationId,
    loading,
    error,
    setCurrentConversationId,
    addConversation,
    deleteConvo,
    newConversation,
    refetch: fetchConversations,
  };
}
