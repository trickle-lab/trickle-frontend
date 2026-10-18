import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
      {/* Logo / wordmark */}
      <div className="mb-8">
        <span className="text-4xl font-bold tracking-tight text-white">
          trickle
          <span className="text-blue-400">.</span>
        </span>
      </div>

      {/* Headline */}
      <h1 className="max-w-xl text-5xl font-semibold leading-tight tracking-tight text-white mb-4">
        Stream payments on Stellar
      </h1>
      <p className="max-w-md text-lg text-zinc-400 mb-10">
        Lock funds once. Release them continuously to any Stellar address — by
        the second, over any duration you choose.
      </p>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/streams"
          className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-blue-500 text-white font-semibold hover:bg-blue-400 transition-colors"
        >
          View streams
        </Link>
        <Link
          href="/streams/new"
          className="inline-flex items-center justify-center h-12 px-8 rounded-full border border-zinc-700 text-zinc-300 font-semibold hover:bg-zinc-800 transition-colors"
        >
          Create a stream
        </Link>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-3 mt-16">
        {[
          "⚡ Soroban smart contract",
          "🔐 Freighter wallet",
          "🌐 Stellar testnet",
          "📡 Live event indexer",
        ].map((f) => (
          <span
            key={f}
            className="px-4 py-1.5 rounded-full bg-zinc-800 text-zinc-400 text-sm"
          >
            {f}
          </span>
        ))}
      </div>
    </main>
  );
}
