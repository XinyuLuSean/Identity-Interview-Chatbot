"use client";

import { useState, useTransition } from "react";
import { LockKeyhole, LoaderCircle } from "lucide-react";

export function ResearchGate() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="card-surface w-full max-w-md rounded-[2rem] border border-white/60 p-8 shadow-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-pine/15 p-3 text-pine">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-ink/45">Researcher access</p>
            <h1 className="font-display text-3xl text-ink">Unlock dashboard</h1>
          </div>
        </div>

        <p className="mb-5 text-sm leading-6 text-ink/70">
          Enter the researcher access code to review transcripts, coding decisions, and weighted summaries.
        </p>

        <input
          className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay"
          onChange={(event) => setCode(event.target.value)}
          placeholder="Researcher access code"
          type="password"
          value={code}
        />

        {error ? (
          <div className="mt-4 rounded-2xl border border-ember/20 bg-ember/10 px-4 py-3 text-sm text-ember">
            {error}
          </div>
        ) : null}

        <button
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:opacity-60"
          disabled={pending}
          onClick={() => {
            startTransition(() => {
              void (async () => {
                setError(null);
                const response = await fetch("/api/research/auth", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code }),
                });

                if (!response.ok) {
                  const body = await response.json();
                  setError(body.error || "Access denied.");
                  return;
                }

                window.location.reload();
              })();
            });
          }}
          type="button"
        >
          {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Unlock
        </button>
      </div>
    </main>
  );
}

