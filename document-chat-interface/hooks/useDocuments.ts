"use client";

import { useState, useCallback, useEffect } from "react";
import { Document } from "@/lib/types";
import {
  uploadDocument as apiUploadDocument,
  getDocuments as apiGetDocuments,
  getDocumentStatus as apiGetDocumentStatus,
  deleteDocument as apiDeleteDocument,
} from "@/lib/api";

export function useDocuments(userId: string | null) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch documents
  const fetchDocuments = useCallback(async () => {
    if (!userId) return;

    try {
      setLoading(true);
      setError(null);
      const docs = await apiGetDocuments(userId);
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
      console.error("[v0] Error fetching documents:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Poll for processing documents every 2s
  useEffect(() => {
    const processingDocs = documents.filter((d) => d.status === "processing");
    if (processingDocs.length === 0 || !userId) return;

    const interval = setInterval(async () => {
      try {
        const updated = await Promise.all(
          processingDocs.map((doc) => apiGetDocumentStatus(userId, doc.id))
        );

        setDocuments((prev) => {
          const docMap = new Map(prev.map((d) => [d.id, d]));
          updated.forEach((doc) => {
            const existing = docMap.get(doc.id);
            docMap.set(doc.id, { ...existing, ...doc } as Document);
          });
          return Array.from(docMap.values());
        });
      } catch (err) {
        console.error("[v0] Error polling document status:", err);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [documents, userId]);

  // Upload document
  const uploadDoc = useCallback(
    async (file: File): Promise<void> => {
      if (!userId) {
        setError("User not authenticated");
        return;
      }

      try {
        setUploading(true);
        setError(null);
        const newDoc = await apiUploadDocument(userId, file);
        setDocuments((prev) => [...prev, newDoc]);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Upload failed";
        setError(errorMsg);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [userId]
  );

  // Delete document
  const deleteDoc = useCallback(
    async (docId: string) => {
      if (!userId) return;

      try {
        setError(null);
        await apiDeleteDocument(userId, docId);
        setDocuments((prev) => prev.filter((d) => d.id !== docId));
        setSelectedDocIds((prev) => {
          const next = new Set(prev);
          next.delete(docId);
          return next;
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
        throw err;
      }
    },
    [userId]
  );

  // Toggle document selection
  const toggleDocSelection = useCallback((docId: string) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  }, []);

  // Select all ready documents
  const selectAllReady = useCallback(() => {
    const readyDocIds = documents
      .filter((d) => d.status === "ready")
      .map((d) => d.id);
    setSelectedDocIds(new Set(readyDocIds));
  }, [documents]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedDocIds(new Set());
  }, []);

  return {
    documents,
    selectedDocIds,
    uploading,
    loading,
    error,
    uploadDoc,
    deleteDoc,
    toggleDocSelection,
    selectAllReady,
    clearSelection,
    refetch: fetchDocuments,
  };
}
