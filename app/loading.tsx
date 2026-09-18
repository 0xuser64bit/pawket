export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-12">
      <div
        aria-busy="true"
        aria-label="Loading"
        className="animate-pulse space-y-3"
      >
        <div className="h-4 w-40 rounded bg-slate-200" />
        <div className="h-9 w-2/3 rounded bg-slate-200" />
        <div className="h-4 w-1/2 rounded bg-slate-200" />
      </div>
    </main>
  );
}
