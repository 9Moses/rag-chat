"use client";

import { ConnectionState } from "@/hooks/useConnectionStatus";

interface ConnectionStatusBannerProps {
  connectionState: ConnectionState;
  isChecking: boolean;
  justReconnected: boolean;
  onRefresh: () => void;
}

export function ConnectionStatusBanner({
  connectionState,
  isChecking,
  justReconnected,
  onRefresh,
}: ConnectionStatusBannerProps) {
  if (connectionState === "connected" && !justReconnected) {
    return null;
  }

  if (justReconnected) {
    return (
      <div className="w-full bg-emerald-600/90 text-white px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-top-2">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200"></span>
          </span>
          <span>Connection restored. All systems online.</span>
        </div>
      </div>
    );
  }

  const isOffline = connectionState === "offline";

  return (
    <div
      className={`w-full px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between shadow-sm border-b transition-all duration-300 ${
        isOffline
          ? "bg-amber-500/15 border-amber-500/30 text-amber-900 dark:text-amber-200"
          : "bg-red-500/15 border-red-500/30 text-red-900 dark:text-red-200"
      }`}
    >
      <div className="flex items-center space-x-2.5">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span
            className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
              isOffline ? "bg-amber-500" : "bg-red-500"
            }`}
          ></span>
        </span>
        <div>
          {isOffline ? (
            <span>
              <strong>No Internet Connection:</strong> Please check your network setup.
            </span>
          ) : (
            <span>
              <strong>Server Disconnected:</strong> Backend service is unreachable.
            </span>
          )}
        </div>
      </div>

      <button
        onClick={onRefresh}
        disabled={isChecking}
        className={`px-3 py-1 text-xs font-semibold rounded-md transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer ${
          isOffline
            ? "bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
            : "bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
        }`}
      >
        <svg
          className={`w-3.5 h-3.5 ${isChecking ? "animate-spin" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
        <span>{isChecking ? "Checking..." : "Reconnect Now"}</span>
      </button>
    </div>
  );
}
