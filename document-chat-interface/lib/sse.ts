/* SSE stream parser for chat streaming */

import { ChatResponse, APIError } from "./types";

export async function parseSSEStream(
  response: Response,
  onEvent: (event: SSEEvent) => void,
  onError: (error: APIError) => void
): Promise<void> {
  if (!response.body) {
    onError({
      error_code: "STREAM_ERROR",
      error_message: "No response body",
    });
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n\n");
      buffer = lines[lines.length - 1];

      for (let i = 0; i < lines.length - 1; i++) {
        const eventText = lines[i].trim();
        if (!eventText) continue;

        try {
          const event = parseSSEEvent(eventText);
          if (event) {
            onEvent(event);
          }
        } catch (err) {
          console.error("[v0] Failed to parse SSE event:", err);
        }
      }
    }

    if (buffer.trim()) {
      try {
        const event = parseSSEEvent(buffer.trim());
        if (event) {
          onEvent(event);
        }
      } catch (err) {
        console.error("[v0] Failed to parse final SSE event:", err);
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export interface SSEEvent {
  type: "conversation" | "token" | "citations" | "done" | "error";
  data: unknown;
}

function parseSSEEvent(eventText: string): SSEEvent | null {
  let eventType: string | null = null;
  let eventData: string | null = null;

  const lines = eventText.split("\n");
  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventType = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      eventData = line.slice(5).trim();
    }
  }

  if (!eventType || !eventData) return null;

  try {
    const parsedData = JSON.parse(eventData);

    if (eventType === "conversation") {
      return { type: "conversation", data: parsedData };
    } else if (eventType === "token") {
      return { type: "token", data: parsedData };
    } else if (eventType === "citations") {
      return { type: "citations", data: parsedData };
    } else if (eventType === "done") {
      return { type: "done", data: parsedData };
    } else if (eventType === "error") {
      return { type: "error", data: parsedData };
    }
  } catch (err) {
    console.error("[v0] Failed to parse SSE data:", err);
  }

  return null;
}
