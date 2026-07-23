"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type ConnectionState = "connected" | "offline" | "server_disconnected";

export function useConnectionStatus(checkIntervalMs = 15000) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isServerConnected, setIsServerConnected] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("connected");
  const previousStateRef = useRef<ConnectionState>("connected");
  const [justReconnected, setJustReconnected] = useState<boolean>(false);

  // Check backend server health
  const checkServerHealth = useCallback(async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const res = await fetch(`${API_URL}/health`, {
        method: "GET",
        cache: "no-store",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return res.ok;
    } catch {
      return false;
    }
  }, []);

  // Full connection check (browser network + backend server)
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true);
    const online = typeof navigator !== "undefined" ? navigator.onLine : true;
    setIsOnline(online);

    if (!online) {
      setIsServerConnected(false);
      setConnectionState("offline");
      setIsChecking(false);
      previousStateRef.current = "offline";
      return false;
    }

    const serverOk = await checkServerHealth();
    setIsServerConnected(serverOk);

    let newState: ConnectionState = "connected";
    if (!online) {
      newState = "offline";
    } else if (!serverOk) {
      newState = "server_disconnected";
    }

    // Check if we just reconnected from a disconnected state
    if (
      (previousStateRef.current === "offline" || previousStateRef.current === "server_disconnected") &&
      newState === "connected"
    ) {
      setJustReconnected(true);
      setTimeout(() => setJustReconnected(false), 4000);
    }

    previousStateRef.current = newState;
    setConnectionState(newState);
    setIsChecking(false);
    return newState === "connected";
  }, [checkServerHealth]);

  // Initial check & network event listeners
  useEffect(() => {
    // Sync browser online state
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);
    }

    checkConnection();

    const handleOnline = () => {
      setIsOnline(true);
      checkConnection();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionState("offline");
      previousStateRef.current = "offline";
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic health check
    const interval = setInterval(() => {
      checkConnection();
    }, checkIntervalMs);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, [checkConnection, checkIntervalMs]);

  return {
    isOnline,
    isServerConnected,
    isChecking,
    connectionState,
    justReconnected,
    checkConnection,
  };
}
