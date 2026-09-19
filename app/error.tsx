"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-start justify-center gap-4 px-5 py-12">
      <h1 className="text-2xl font-bold text-slate-100">
        Something went wrong
      </h1>
      <p className="max-w-xl text-sm text-slate-400">
        The den ran into a problem. Try again — your guest companion is saved
        in this browser.
      </p>
      {error.digest ? (
        <p className="font-mono text-xs text-slate-500">
          Error ID: {error.digest}
        </p>
      ) : null}
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-200"
      >
        Try again
      </button>
    </main>
  );
}
