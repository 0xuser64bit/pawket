import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col items-start justify-center gap-4 px-5 py-12">
      <h1 className="text-2xl font-bold text-slate-100">Page not found</h1>
      <p className="text-sm text-slate-400">
        The page you are looking for does not exist.
      </p>
      <Link href="/" className="font-medium text-amber-200/90 underline">
        Back home
      </Link>
    </main>
  );
}
