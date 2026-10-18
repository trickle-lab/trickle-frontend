"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchStreamEvents, type StreamEvent } from "@/lib/api";

function formatAmount(raw?: string) {
  if (!raw) return "—";
  return (Number(raw) / 1e7).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  });
}

function EventBadge({ type }: { type: string }) {
  const colours: Record<string, string> = {
    created: "bg-blue-500/20 text-blue-300",
    withdraw: "bg-green-500/20 text-green-300",
    cancelled: "bg-red-500/20 text-red-300",
  };
  return (
    <span
      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${colours[type] ?? "bg-zinc-700 text-zinc-300"}`}
    >
      {type}
    </span>
  );
}

export default function StreamsPage() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStreamEvents()
      .then(setEvents)
      .catch(() => setError("Could not reach the Trickle indexer. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="text-zinc-500 text-sm hover:text-zinc-300 mb-2 inline-block">
            ← Home
          </Link>
          <h1 className="text-2xl font-semibold text-white">Stream activity</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Live events decoded from the Trickle contract on Stellar testnet.
          </p>
        </div>
        <Link
          href="/streams/new"
          className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-blue-500 text-white text-sm font-semibold hover:bg-blue-400 transition-colors"
        >
          + New stream
        </Link>
      </div>

      {/* States */}
      {loading && (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-zinc-800 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-4xl mb-3">📡</p>
          <p>No stream events yet. Create the first one!</p>
        </div>
      )}

      {/* Events table */}
      {!loading && !error && events.length > 0 && (
        <div className="rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-zinc-400 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left">Stream ID</th>
                <th className="px-4 py-3 text-left">Event</th>
                <th className="px-4 py-3 text-right">Amount (XLM)</th>
                <th className="px-4 py-3 text-right">Duration (s)</th>
                <th className="px-4 py-3 text-right">Ledger</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-zinc-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-zinc-300">{e.streamId}</td>
                  <td className="px-4 py-3">
                    <EventBadge type={e.type} />
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-300">
                    {formatAmount(e.amount)}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-400">
                    {e.duration ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-500 font-mono text-xs">
                    {e.ledger}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
