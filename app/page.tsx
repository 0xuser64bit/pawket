import Link from "next/link";

const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER ?? "devnet";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-5 py-12">
      <header className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
          Pawket · web-first foundation · {cluster}
        </p>
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          A living companion on Solana
        </h1>
        <p className="max-w-2xl text-base text-slate-600">
          This is the clean web foundation. Wallet connection, Solana client
          infrastructure, and the care loop build on top of this shell — not
          inside it.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Wallet</h2>
          <p className="mt-1 text-sm text-slate-600">
            Wallet Standard discovery and connection live at the leaves of the
            component tree.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Solana</h2>
          <p className="mt-1 text-sm text-slate-600">
            One Kit client, explicit cluster config, and PDA helpers in{" "}
            <code className="font-mono text-xs">src/lib/solana</code>.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Health</h2>
          <p className="mt-1 text-sm text-slate-600">
            <Link
              href="/api/health"
              className="font-medium text-sky-700 underline"
            >
              /api/health
            </Link>{" "}
            reports build version and active cluster.
          </p>
        </div>
      </section>

      <footer className="text-sm text-slate-500">
        Devnet by default. Nothing here signs, sends, or spends.
      </footer>
    </main>
  );
}
