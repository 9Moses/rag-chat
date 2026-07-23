"use client";

import { Document } from "@/lib/types";

interface DocumentListProps {
  documents: Document[];
  selectedIds: Set<string>;
  onToggleSelect: (docId: string) => void;
  onDelete: (docId: string) => void;
  uploading: boolean;
}

function getStatusBadge(status: Document["status"]) {
  switch (status) {
    case "ready":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Ready
        </span>
      );
    case "processing":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse">
          Processing...
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Failed
        </span>
      );
  }
}

export function DocumentList({
  documents,
  selectedIds,
  onToggleSelect,
  onDelete,
  uploading,
}: DocumentListProps) {
  if (documents?.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {uploading ? "Uploading..." : "No documents yet"}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {documents?.map((doc) => (
        <div
          key={doc?.id}
          className="flex items-center gap-2 px-3 py-2 rounded hover:bg-muted transition-colors group"
        >
          <input
            type="checkbox"
            checked={selectedIds.has(doc?.id)}
            onChange={() => onToggleSelect(doc?.id)}
            disabled={doc?.status !== "ready"}
            className="w-4 h-4 rounded border-border accent-accent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {doc?.filename || "Loading..."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge(doc?.status)}
            <button
              onClick={() => onDelete(doc?.id)}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all p-1 cursor-pointer"
              title="Delete document"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
