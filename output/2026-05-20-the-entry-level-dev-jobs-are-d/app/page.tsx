import Link from 'next/link';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl md:text-7xl font-light tracking-tight mb-6">TheEntryLevelDevJobsAreD</h1>
        <p className="text-xl text-zinc-400 mb-10 leading-relaxed">An app responding to: "The entry level dev jobs are disappearing."</p>
        <Link
          href="/app"
          className="inline-block px-6 py-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-md font-medium transition"
        >
          Start free →
        </Link>
        <p className="mt-12 text-sm text-zinc-500">Indie hackers, early adopters interested in this trend.</p>
      </div>
    </main>
  );
}
