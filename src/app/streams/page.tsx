"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchStreams, type StreamState } from "@/lib/api";
import { useWallet } from "@/contexts/wallet-context";

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
  cancelled: { label: "Cancelled", className: "bg-red-500/20 text-red-300" },
};

type Message = { kind: "ok" | "error"; text: string; hash?: string };

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-zinc-500 text-xs">{label}</dt>
      <dd className="text-zinc-200">{value}</dd>
    </div>
  );
}

function StreamCard({ stream }: { stream: StreamState }) {
  const { address, connect } = useWallet();
  const [busy, setBusy] = useState<"withdraw" | "cancel" | null>(null);
  const [message, setMessage] = useState<Message | null>(null);

  const style = STATUS_STYLES[stream.status];
  const vestedPct = percent(stream.vested, stream.amount);
  const isOpen = stream.status === "active" || stream.status === "fully_vested";
  const canWithdraw = isOpen && BigInt(stream.available) > BigInt(0);
  const canCancel = stream.status === "active";

  const run = async (action: "withdraw" | "cancel") => {
    setMessage(null);
    if (!address) {
      await connect();
      return;
    }
    setBusy(action);
    try {
      const contract = await import("@/lib/contract");
      if (action === "withdraw") {
        const res = await contract.withdrawStream(stream.streamId, address);
        setMessage({
          kind: "ok",
          text: `Withdrew ${xlm(res.amount.toString())} XLM. This card updates once the indexer picks it up.`,
          hash: res.hash,
        });
      } else {
        const res = await contract.cancelStream(stream.streamId, address);
        setMessage({
          kind: "ok",
          text: "Stream cancelled. This card updates once the indexer picks it up.",
          hash: res.hash,
        });
      }
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "The transaction failed.",
      });
    } finally {
      setBusy(null);
    }
  };

  const buttonClass =
    "h-10 px-5 rounded-full text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors";

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
        <div
          className={`h-full transition-all ${stream.status === "cancelled" ? "bg-red-500" : "bg-blue-500"}`}
          style={{ width: `${vestedPct}%` }}
        />
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        {stream.status === "cancelled"
          ? `${vestedPct.toFixed(1)}% was paid out before the stream was cancelled`
          : `${vestedPct.toFixed(1)}% vested`}
      </p>

      <dl className="grid grid-cols-3 gap-3 text-sm">
        {stream.status === "cancelled" ? (
          <>
            <Stat label="Paid to recipient" value={`${xlm(stream.withdrawn)} XLM`} />
            <Stat label="Refunded to sender" value={`${xlm(stream.refunded)} XLM`} />
            <Stat label="Available now" value="0" />
          </>
        ) : (
          <>
            <Stat label="Vested" value={xlm(stream.vested)} />
            <Stat label="Withdrawn" value={xlm(stream.withdrawn)} />
            <Stat label="Available now" value={xlm(stream.available)} />
          </>
        )}
      </dl>

      {(canWithdraw || canCancel) && (
        <div className="mt-4 flex flex-wrap gap-3">
          {canWithdraw && (
            <button
              type="button"
              onClick={() => run("withdraw")}
              disabled={busy !== null}
              className={`${buttonClass} bg-blue-500 text-white hover:bg-blue-400`}
            >
              {busy === "withdraw"
                ? "Waiting for wallet and network…"
                : address
                  ? "Withdraw"
                  : "Connect wallet to withdraw"}
            </button>
          )}
          {canCancel && (
            <button
              type="button"
              onClick={() => run("cancel")}
              disabled={busy !== null}
              className={`${buttonClass} border border-red-500/50 text-red-300 hover:bg-red-500/10`}
            >
              {busy === "cancel" ? "Waiting for wallet and network…" : "Cancel stream"}
            </button>
          )}
        </div>
      )}

      {message && (
        <p className={`mt-3 text-sm ${message.kind === "ok" ? "text-green-300" : "text-red-400"}`}>
          {message.text}{" "}
          {message.hash && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${message.hash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline text-blue-400"
            >
              View transaction
            </a>
          )}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
        <span>Started {new Date(stream.startedAt).toLocaleString()}</span>
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${stream.createdTxHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:underline"
        >
          View creation transaction
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
