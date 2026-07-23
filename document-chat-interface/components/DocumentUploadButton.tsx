"use client";

import { useRef, useState } from "react";

interface DocumentUploadButtonProps {
  onUpload: (file: File) => Promise<void>;
  loading: boolean;
}

export function DocumentUploadButton({ onUpload, loading }: DocumentUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported");
      return;
    }

    try {
      setError(null);
      await onUpload(file);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Upload failed";
      setError(errorMsg);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
          dragActive
            ? "border-accent bg-accent/5"
            : "border-border hover:border-accent/50"
        } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
        onClick={() => !loading && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          onChange={handleChange}
          disabled={loading}
          className="hidden"
        />
        <p className="text-sm font-medium text-foreground">
          {loading ? "Uploading..." : "Click or drag PDF"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">PDF files only</p>
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-2">{error}</p>
      )}
    </div>
  );
}
