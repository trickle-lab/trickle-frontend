"use client";
import { useState } from "react";
import Link from "next/link";
import { useWallet } from "@/contexts/wallet-context";

function toStroops(value: string): bigint {
  const [whole, frac = ""] = value.trim().split(".");
  const padded = (frac + "0000000").slice(0, 7);
  return BigInt(whole || "0") * BigInt(10000000) + BigInt(padded);
}

export default function NewStreamPage() {
  const { address, connect, isConnecting } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<{ hash: string; streamId: string | null } | null>(null);

  const fail = (msg: string) => {
    setErrorMsg(msg);
    setStatus("error");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;
    const { StrKey } = await import("@stellar/stellar-sdk");
    const { createStream } = await import("@/lib/contract");

    if (!StrKey.isValidEd25519PublicKey(recipient.trim())) {
      return fail("Recipient must be a valid Stellar address (starts with G).");
    }
    if (!/^\d+(\.\d{1,7})?$/.test(amount.trim()) || toStroops(amount) <= BigInt(0)) {
      return fail("Amount must be a positive number with up to 7 decimals.");
    }
    if (!/^\d+$/.test(duration.trim()) || BigInt(duration.trim()) <= BigInt(0)) {
      return fail("Duration must be a positive whole number of seconds.");
    }

    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await createStream({
        sender: address,
        recipient: recipient.trim(),
        amount: toStroops(amount),
        duration: BigInt(duration.trim()),
      });
      setResult(res);
      setStatus("success");
    } catch (err) {
      fail(err instanceof Error ? err.message : "Transaction failed.");
    }
  };

  const inputClass =
    "w-full h-11 px-4 rounded-xl bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-blue-500 transition-colors";

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <Link href="/streams" className="text-zinc-500 text-sm hover:text-zinc-300 mb-6 inline-block">
        ← Stream activity
      </Link>
      <h1 className="text-2xl font-semibold text-white mb-1">Create a stream</h1>
      <p className="text-zinc-400 text-sm mb-8">
        Your XLM is locked in the Trickle contract and released linearly to the recipient over the
        chosen duration.
      </p>

      {status === "success" && result ? (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-6 py-8 text-center">
          <p className="text-green-300 font-medium mb-1">
            Stream {result.streamId !== null ? `#${result.streamId} ` : ""}created on testnet
          </p>
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${result.hash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 text-sm underline break-all"
          >
            View transaction
          </a>
          <div className="mt-6">
            <Link
              href="/streams"
              className="inline-flex items-center justify-center h-10 px-5 rounded-full bg-blue-500 text-white text-sm font-semibold hover:bg-blue-400 transition-colors"
            >
              View stream activity
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Recipient address</label>
            <input
              className={inputClass}
              placeholder="G…"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Amount (XLM)</label>
            <input
              className={inputClass}
              placeholder="1.5"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Duration (seconds)</label>
            <input
              className={inputClass}
              placeholder="3600 = 1 hour"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          </div>

          {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}

          {address ? (
            <button
              type="submit"
              disabled={status === "submitting"}
              className="w-full h-12 rounded-full bg-blue-500 text-white font-semibold hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === "submitting" ? "Waiting for wallet and network…" : "Create stream"}
            </button>
          ) : (
            <button
              type="button"
              onClick={connect}
              disabled={isConnecting}
              className="w-full h-12 rounded-full bg-blue-500 text-white font-semibold hover:bg-blue-400 disabled:opacity-50 transition-colors"
            >
              {isConnecting ? "Connecting…" : "Connect wallet"}
            </button>
          )}

          {address && (
            <p className="text-center text-xs text-zinc-600 font-mono">
              Connected: {address.slice(0, 6)}…{address.slice(-4)}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
