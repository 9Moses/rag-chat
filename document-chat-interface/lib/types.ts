/* Types for RAG Chat Application */

export interface User {
  id: string;
  email: string;
}

export type DocumentStatus = "processing" | "ready" | "failed";

export interface Document {
  id: string;
  filename: string;
  status: DocumentStatus;
  created_at: string;
  error_message?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
}

export interface Citation {
  document_id: string;
  filename?: string;
  document_name?: string;
  page_number?: number | null;
  chunk_id?: string;
  snippet?: string;
}

export interface ChatRequest {
  message: string;
  conversation_id: string | null;
  document_ids: string[];
}

export interface ChatResponse {
  conversation_id: string;
  message_id: string;
  token: string;
  citations: Citation[];
  done: boolean;
}

export interface APIError {
  error_code: string;
  error_message: string;
}
