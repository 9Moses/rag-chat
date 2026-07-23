/* API client for backend communication using Axios */

import axios, { AxiosError } from "axios";
import { Document, Conversation, Message, APIError } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

function handleApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const responseData = error.response?.data;

    console.error(
      `[API Error] HTTP ${status || "Network Error"}:`,
      responseData || error.message
    );

    if (responseData && typeof responseData === "object") {
      const apiErr = responseData as Partial<APIError> & {
        detail?: string;
        message?: string;
      };
      throw {
        error_code: apiErr.error_code || `HTTP_${status || "UNKNOWN"}`,
        error_message:
          apiErr.error_message || apiErr.detail || apiErr.message || error.message,
      } as APIError;
    }

    throw {
      error_code: `HTTP_${status || "NETWORK_ERROR"}`,
      error_message: error.message || "An unexpected network error occurred.",
    } as APIError;
  }

  console.error("[API Error] Unexpected non-axios error:", error);
  throw {
    error_code: "UNKNOWN_ERROR",
    error_message:
      error instanceof Error ? error.message : "An unexpected error occurred.",
  } as APIError;
}

export async function identifyUser(email: string): Promise<{ user_id: string }> {
  try {
    const response = await apiClient.post<{ user_id: string }>("/users/identify", {
      email,
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function uploadDocument(
  userId: string,
  file: File
): Promise<Document> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<Document>("/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        "X-User-Id": userId,
      },
    });

    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getDocuments(userId: string): Promise<Document[]> {
  try {
    const response = await apiClient.get<Document[]>("/documents", {
      headers: { "X-User-Id": userId },
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function getDocumentStatus(
  userId: string,
  documentId: string
): Promise<Document> {
  try {
    const response = await apiClient.get<Document>(
      `/documents/${documentId}/status`,
      {
        headers: { "X-User-Id": userId },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function deleteDocument(
  userId: string,
  documentId: string
): Promise<void> {
  try {
    await apiClient.delete(`/documents/${documentId}`, {
      headers: { "X-User-Id": userId },
    });
  } catch (error) {
    handleApiError(error);
  }
}

export async function getConversations(userId: string): Promise<Conversation[]> {
  try {
    const response = await apiClient.get<Conversation[]>("/conversations", {
      headers: { "X-User-Id": userId },
    });
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

export async function deleteConversation(
  userId: string,
  conversationId: string
): Promise<void> {
  try {
    await apiClient.delete(`/conversations/${conversationId}`, {
      headers: { "X-User-Id": userId },
    });
  } catch (error) {
    handleApiError(error);
  }
}

export async function getConversationMessages(
  userId: string,
  conversationId: string
): Promise<Message[]> {
  try {
    const response = await apiClient.get<Message[]>(
      `/conversations/${conversationId}/messages`,
      {
        headers: { "X-User-Id": userId },
      }
    );
    return response.data;
  } catch (error) {
    handleApiError(error);
  }
}

