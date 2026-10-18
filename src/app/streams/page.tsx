"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchStreams, type StreamState } from "@/lib/api";

const STROOPS = BigInt(10000000);

function xlm(raw: string): string {
  const v = BigInt(raw);
  const whole = v / STROOPS;
  const frac = (v % STROOPS).toString().padStart(7, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

function percent(part: string, total: string): number {
  const t = BigInt(total);
  if (t <= BigInt(0)) return 0;
  return Math.min(100, Number((BigInt(part) * BigInt(10000)) / t) / 100);
}

function formatDuration(seconds: string): string {
  const s = Number(seconds);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)} min`;
  if (s < 86400) return `${(s / 3600).toFixed(1).replace(/\.0$/, "")} h`;
  return `${(s / 86400).toFixed(1).replace(/\.0$/, "")} days`;
}

const STATUS_STYLES: Record<StreamState["status"], { label: string; className: string }> = {
  active: { label: "Streaming", className: "bg-blue-500/20 text-blue-300" },
  fully_vested: { label: "Fully vested", className: "bg-green-500/20 text-green-300" },
  completed: { label: "Completed", className: "bg-zinc-700 text-zinc-300" },
};

function StreamCard({ stream }: { stream: StreamState }) {
  const style = STATUS_STYLES[stream.status];
  const vestedPct = percent(stream.vested, stream.amount);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">Stream #{stream.streamId}</h2>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${style.className}`}>
          {style.label}
        </span>
      </div>

      <div className="flex items-end justify-between mb-2">
        <span className="text-2xl font-semibold text-white">{xlm(stream.amount)} XLM</span>
        <span className="text-sm text-zinc-400">over {formatDuration(stream.duration)}</span>
      </div>

      <div
        className="h-2 rounded-full bg-zinc-800 overflow-hidden mb-2"
        role="progressbar"
        aria-valuenow={Math.round(vestedPct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Stream ${stream.streamId} vested`}
      >
        <div className="h-full bg-blue-500 transition-all" style={{ width: `${vestedPct}%` }} />
      </div>
      <p className="text-xs text-zinc-500 mb-4">{vestedPct.toFixed(1)}% vested</p>

      <dl className="grid grid-cols-3 gap-3 text-sm">
        <div>
          <dt className="text-zinc-500 text-xs">Vested</dt>
          <dd className="text-zinc-200">{xlm(stream.vested)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 text-xs">Withdrawn</dt>
          <dd className="text-zinc-200">{xlm(stream.withdrawn)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500 text-xs">Available now</dt>
          <dd className="text-zinc-200">{xlm(stream.available)}</dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
        <span>Started {new Date(stream.startedAt).toLocaleString()}</span>
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${stream.createdTxHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          View transaction
        </a>
      </div>
    </div>
  );
}

export default function StreamsPage() {
  const [streams, setStreams] = useState<StreamState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = () =>
      fetchStreams()
        .then((data) => {
          if (cancelled) return;
          setStreams(data);
          setError(null);
        })
        .catch(() => {
          if (!cancelled) setError("Could not reach the Trickle indexer. Is the backend running?");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

    load();
    const timer = setInterval(load, 10000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/" className="text-zinc-500 text-sm hover:text-zinc-300 mb-2 inline-block">
            ← Home
          </Link>
          <h1 className="text-2xl font-semibold text-white">Streams</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Payment streams indexed from the Trickle contract on Stellar testnet.
          </p>
        </div>
        <Link
          href="/streams/new"
          className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-blue-500 text-white text-sm font-semibold hover:bg-blue-400 transition-colors"
        >
          + New stream
        </Link>
      </div>

      {loading && (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 rounded-xl bg-zinc-800 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-300 text-sm mb-4">
          {error}
        </div>
      )}

      {!loading && !error && streams.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          <p>No streams yet. Create the first one.</p>
        </div>
      )}

      <div className="space-y-4">
        {streams.map((s) => (
          <StreamCard key={s.streamId} stream={s} />
        ))}
      </div>
    </div>
  );
}
