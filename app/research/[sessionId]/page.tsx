import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { SessionReview } from "@/components/research/session-review";
import { getSession } from "@/lib/session-service";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function ResearchSessionPage({ params }: PageProps) {
  const { sessionId } = await params;
  const session = await getSession(sessionId);

  if (!session) {
    notFound();
  }

  return (
    <main className="grid-paper min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="card-surface rounded-[2rem] border border-white/60 p-6 shadow-card">
          <Link
            className="inline-flex items-center gap-2 text-sm font-medium text-pine transition hover:text-pine/80"
            href="/research"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <div className="mt-4">
            <p className="text-xs uppercase tracking-[0.24em] text-ink/45">Research session review</p>
            <h1 className="font-display text-4xl text-ink">{session.subjectId}</h1>
          </div>
        </div>

        <SessionReview initialSession={session} />
      </div>
    </main>
  );
}
