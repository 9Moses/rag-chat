"use client";

import { useState } from "react";
import { useUser } from "@/context/UserContext";
import { identifyUser } from "@/lib/api";

export function EmailGate() {
  const { setUser } = useUser();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const { user_id } = await identifyUser(email);
      setUser({ id: user_id, email });
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Failed to identify user";
      setError(errorMsg);
      console.error("[v0] Identification error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg p-8 w-full max-w-md shadow-lg">
        <h1 className="text-2xl font-semibold mb-2 text-foreground">
          Chat with Your Documents
        </h1>
        <p className="text-muted-foreground mb-6">
          Enter your email to get started
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={loading}
              className="w-full px-3 py-2 border border-border rounded-md bg-input text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-50"
              required
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim()}
            className="w-full px-4 py-2 bg-accent text-accent-foreground font-medium rounded-md hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            {loading ? "Connecting..." : "Continue"}
          </button>
        </form>

        <p className="text-xs text-muted-foreground mt-4">
          No account needed. We&apos;ll create one for you automatically.
        </p>
      </div>
    </div>
  );
}
