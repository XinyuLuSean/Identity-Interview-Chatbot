"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Save } from "lucide-react";

import { CODING_CATEGORIES } from "@/lib/domain/protocol";
import type { InterviewSession } from "@/lib/domain/schemas";
import { cn, formatDateTime } from "@/lib/utils";

const SOURCE_KEYS = ["source1", "source2", "source3", "source4", "source5"] as const;

export function SessionReview({ initialSession }: { initialSession: InterviewSession }) {
  const [session, setSession] = useState(initialSession);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function saveSession() {
    startTransition(() => {
      void (async () => {
        setError(null);
        setSaved(null);
        const response = await fetch(`/api/research/sessions/${session.sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            structuredRecord: session.structuredRecord,
            participantKey: session.participantKey,
            codingRecords: session.codingRecords,
            followUpReasons: session.followUpReasons,
          }),
        });

        const body = await response.json();
        if (!response.ok) {
          setError(body.error || "Unable to save review changes.");
          return;
        }

        setSession(body.session);
        setSaved("Changes saved.");
      })();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <section className="space-y-6">
        <div className="card-surface rounded-[2rem] border border-white/60 p-6 shadow-card">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-ink/45">Transcript</p>
              <h2 className="font-display text-3xl text-ink">Session conversation</h2>
            </div>
            <div className="text-right text-sm text-ink/60">
              <div>{session.subjectId}</div>
              <div>{formatDateTime(session.updatedAt)}</div>
            </div>
          </div>
          <div className="grid gap-3">
            {session.transcript.map((message) => (
              <div
                className={cn(
                  "rounded-[1.4rem] px-4 py-3 text-sm shadow-sm",
                  message.role === "participant"
                    ? "ml-auto max-w-[88%] rounded-br-md bg-pine text-white"
                    : message.role === "researcher"
                      ? "max-w-[88%] rounded-bl-md border border-ember/20 bg-ember/10 text-ink"
                      : "max-w-[88%] rounded-bl-md border border-ink/10 bg-white/90 text-ink",
                )}
                key={message.id}
              >
                <div className="mb-1 text-[10px] uppercase tracking-[0.24em] opacity-65">
                  {message.role}
                </div>
                <div className="whitespace-pre-wrap">{message.content}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="card-surface rounded-[2rem] border border-white/60 p-6 shadow-card">
          <p className="text-xs uppercase tracking-[0.24em] text-ink/45">Structured record</p>
          <h2 className="font-display text-3xl text-ink">Editable interview table</h2>
          <div className="mt-5 grid gap-3">
            {SOURCE_KEYS.map((sourceKey, index) => (
              <input
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay"
                key={sourceKey}
                onChange={(event) =>
                  setSession((current) => ({
                    ...current,
                    structuredRecord: current.structuredRecord
                      ? {
                          ...current.structuredRecord,
                          [sourceKey]: event.target.value,
                        }
                      : null,
                  }))
                }
                placeholder={`Source ${index + 1}`}
                value={session.structuredRecord?.[sourceKey] ?? ""}
              />
            ))}
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay"
                onChange={(event) =>
                  setSession((current) => ({
                    ...current,
                    structuredRecord: current.structuredRecord
                      ? { ...current.structuredRecord, age: event.target.value }
                      : null,
                  }))
                }
                placeholder="Age"
                value={session.structuredRecord?.age ?? ""}
              />
              <input
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay"
                onChange={(event) =>
                  setSession((current) => ({
                    ...current,
                    structuredRecord: current.structuredRecord
                      ? { ...current.structuredRecord, gender: event.target.value }
                      : null,
                  }))
                }
                placeholder="Gender"
                value={session.structuredRecord?.gender ?? ""}
              />
            </div>
          </div>
        </div>

        <div className="card-surface rounded-[2rem] border border-white/60 p-6 shadow-card">
          <p className="text-xs uppercase tracking-[0.24em] text-ink/45">Participant key</p>
          <h2 className="font-display text-3xl text-ink">Contact and metadata</h2>
          <div className="mt-5 grid gap-3">
            <input
              className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay"
              onChange={(event) =>
                setSession((current) => ({
                  ...current,
                  participantKey: current.participantKey
                    ? { ...current.participantKey, name: event.target.value }
                    : null,
                }))
              }
              placeholder="Name"
              value={session.participantKey?.name ?? ""}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay"
                onChange={(event) =>
                  setSession((current) => ({
                    ...current,
                    participantKey: current.participantKey
                      ? { ...current.participantKey, age: event.target.value }
                      : null,
                  }))
                }
                placeholder="Age"
                value={session.participantKey?.age ?? ""}
              />
              <input
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay"
                onChange={(event) =>
                  setSession((current) => ({
                    ...current,
                    participantKey: current.participantKey
                      ? { ...current.participantKey, gender: event.target.value }
                      : null,
                  }))
                }
                placeholder="Gender"
                value={session.participantKey?.gender ?? ""}
              />
            </div>
            <input
              className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay"
              onChange={(event) =>
                setSession((current) => ({
                  ...current,
                  participantKey: current.participantKey
                    ? { ...current.participantKey, occupation: event.target.value }
                    : null,
                }))
              }
              placeholder="Occupation"
              value={session.participantKey?.occupation ?? ""}
            />
            <input
              className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay"
              onChange={(event) =>
                setSession((current) => ({
                  ...current,
                  participantKey: current.participantKey
                    ? { ...current.participantKey, email: event.target.value }
                    : null,
                }))
              }
              placeholder="Email"
              value={session.participantKey?.email ?? ""}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay"
                onChange={(event) =>
                  setSession((current) => ({
                    ...current,
                    participantKey: current.participantKey
                      ? { ...current.participantKey, date: event.target.value }
                      : null,
                  }))
                }
                placeholder="Date"
                value={session.participantKey?.date ?? ""}
              />
              <input
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay"
                onChange={(event) =>
                  setSession((current) => ({
                    ...current,
                    participantKey: current.participantKey
                      ? { ...current.participantKey, location: event.target.value }
                      : null,
                  }))
                }
                placeholder="Location"
                value={session.participantKey?.location ?? ""}
              />
            </div>
          </div>
        </div>

        <div className="card-surface rounded-[2rem] border border-white/60 p-6 shadow-card">
          <p className="text-xs uppercase tracking-[0.24em] text-ink/45">AI review</p>
          <h2 className="font-display text-3xl text-ink">Automated analysis summary</h2>
          <div className="mt-5 rounded-[1.6rem] border border-ink/10 bg-white/80 p-4 text-sm leading-6 text-ink/72">
            {session.analysisSummary ??
              "Analysis is still pending or was not generated yet. The participant flow now submits first and runs the deeper AI review afterward."}
          </div>
        </div>

        <div className="card-surface rounded-[2rem] border border-white/60 p-6 shadow-card">
          <p className="text-xs uppercase tracking-[0.24em] text-ink/45">Coding review</p>
          <h2 className="font-display text-3xl text-ink">Category approval</h2>
          {session.codingRecords.length === 0 ? (
            <div className="mt-5 rounded-[1.6rem] border border-ink/10 bg-white/80 p-4 text-sm leading-6 text-ink/72">
              Coding suggestions are not available yet. If the participant just completed the interview,
              refresh in a moment after the background analysis finishes.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {session.codingRecords.map((record, index) => (
                <div className="rounded-3xl border border-ink/10 bg-white/80 p-4" key={record.rank}>
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.24em] text-ink/45">
                        Rank {record.rank}
                      </div>
                      <div className="font-semibold text-ink">{record.rawSourceText}</div>
                    </div>
                    <div className="rounded-full border border-ink/10 px-3 py-1 text-xs text-ink/60">
                      Confidence {Math.round(record.confidence * 100)}%
                    </div>
                  </div>
                  <div className="grid gap-3">
                    <div className="text-sm text-ink/60">
                      Suggested: {record.suggestedCategory ?? "Needs manual coding"}
                    </div>
                    <select
                      className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay"
                      onChange={(event) =>
                        setSession((current) => ({
                          ...current,
                          codingRecords: current.codingRecords.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  finalCategory: event.target.value
                                    ? (event.target.value as (typeof CODING_CATEGORIES)[number])
                                    : null,
                                }
                              : item,
                          ),
                        }))
                      }
                      value={record.finalCategory ?? ""}
                    >
                      <option value="">Use suggested category</option>
                      {CODING_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <p className="text-sm leading-6 text-ink/70">{record.rationale}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card-surface rounded-[2rem] border border-white/60 p-6 shadow-card">
          <p className="text-xs uppercase tracking-[0.24em] text-ink/45">Follow-up workflow</p>
          <h2 className="font-display text-3xl text-ink">Follow-up reasons</h2>
          <div className="mt-5 flex flex-wrap gap-2">
            {[
              "no_stereotype_in_top_five",
              "high_category_ambiguity",
              "low_parser_confidence",
              "sparse_or_unexpected_response",
              "researcher_marked",
            ].map((reason) => {
              const active = session.followUpReasons.includes(
                reason as (typeof session.followUpReasons)[number],
              );
              return (
                <button
                  className={cn(
                    "rounded-full border px-3 py-2 text-sm transition",
                    active
                      ? "border-ember/20 bg-ember/10 text-ember"
                      : "border-ink/10 bg-white text-ink/70",
                  )}
                  key={reason}
                  onClick={() =>
                    setSession((current) => ({
                      ...current,
                      followUpReasons: active
                        ? current.followUpReasons.filter((entry) => entry !== reason)
                        : [...current.followUpReasons, reason as (typeof current.followUpReasons)[number]],
                    }))
                  }
                  type="button"
                >
                  {reason.replaceAll("_", " ")}
                </button>
              );
            })}
          </div>

          {(error || saved) ? (
            <div
              className={cn(
                "mt-5 rounded-2xl px-4 py-3 text-sm",
                error
                  ? "border border-ember/20 bg-ember/10 text-ember"
                  : "border border-pine/20 bg-pine/10 text-pine",
              )}
            >
              {error ?? saved}
            </div>
          ) : null}

          <button
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:opacity-60"
            disabled={pending}
            onClick={saveSession}
            type="button"
          >
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save review updates
          </button>
        </div>
      </section>
    </div>
  );
}
