"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Download,
  Filter,
  Hourglass,
  Search,
} from "lucide-react";

import { countSessionsByStatus } from "@/lib/domain/analysis";
import { STEP_TITLES } from "@/lib/domain/protocol";
import type { ResearchDataset } from "@/lib/domain/schemas";
import { formatDateTime } from "@/lib/utils";

function escapeCsvCell(value: string | number | null | undefined) {
  const normalized = value == null ? "" : String(value);
  return `"${normalized.replaceAll('"', '""')}"`;
}

function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function ResearchDashboard({ dataset }: { dataset: ResearchDataset }) {
  const stats = countSessionsByStatus(dataset.sessions);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<
    "all" | "completed" | "active" | "ineligible" | "follow_up" | "needs_review"
  >("all");

  const filteredSessions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return dataset.sessions.filter((session) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        session.subjectId.toLowerCase().includes(normalizedQuery) ||
        session.sessionId.toLowerCase().includes(normalizedQuery) ||
        session.participantKey?.email.toLowerCase().includes(normalizedQuery);

      if (!matchesQuery) {
        return false;
      }

      switch (filter) {
        case "completed":
          return session.status === "completed";
        case "active":
          return session.status === "active";
        case "ineligible":
          return session.status === "terminated_ineligible";
        case "follow_up":
          return session.followUpReasons.length > 0;
        case "needs_review":
          return session.codingRecords.some((record) => record.finalCategory === null);
        case "all":
          return true;
      }
    });
  }, [dataset.sessions, filter, query]);

  return (
    <main className="grid-paper min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="card-surface rounded-[2rem] border border-white/60 p-6 shadow-card sm:p-8">
          <div className="flex flex-col gap-4 border-b border-ink/8 pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-ink/45">Research dashboard</p>
              <h1 className="font-display text-4xl text-ink sm:text-5xl">Interview review workspace</h1>
            </div>
            <p className="max-w-xl text-sm leading-6 text-ink/70">
              Search by subject ID or email, inspect incomplete sessions, review follow-up flags,
              and export structured tables for the final paper workflow.
            </p>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              { label: "Total sessions", value: stats.total, icon: Search, tone: "text-clay bg-clay/10" },
              { label: "Completed", value: stats.completed, icon: CheckCircle2, tone: "text-pine bg-pine/10" },
              { label: "Active", value: stats.active, icon: Hourglass, tone: "text-ink bg-white" },
              { label: "Follow-up", value: stats.followUp, icon: AlertTriangle, tone: "text-ember bg-ember/10" },
            ].map((item) => (
              <div className="rounded-[1.6rem] border border-ink/10 bg-white/80 p-5" key={item.label}>
                <div className={`inline-flex rounded-2xl p-3 ${item.tone}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="mt-4 text-3xl font-semibold text-ink">{item.value}</div>
                <div className="text-sm text-ink/60">{item.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="card-surface rounded-[2rem] border border-white/60 p-6 shadow-card">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-ink/45">Sessions</p>
                <h2 className="font-display text-3xl text-ink">Interview status table</h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <label className="relative min-w-64">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                  <input
                    className="w-full rounded-full border border-ink/10 bg-white px-11 py-3 text-sm outline-none transition focus:border-clay"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search subject ID or email"
                    value={query}
                  />
                </label>
                <label className="relative">
                  <Filter className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/40" />
                  <select
                    className="rounded-full border border-ink/10 bg-white px-11 py-3 text-sm outline-none transition focus:border-clay"
                    onChange={(event) =>
                      setFilter(
                        event.target.value as
                          | "all"
                          | "completed"
                          | "active"
                          | "ineligible"
                          | "follow_up"
                          | "needs_review",
                      )
                    }
                    value={filter}
                  >
                    <option value="all">All sessions</option>
                    <option value="completed">Completed</option>
                    <option value="active">Active</option>
                    <option value="ineligible">Ineligible</option>
                    <option value="follow_up">Needs follow-up</option>
                    <option value="needs_review">Needs manual review</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="mb-5 flex flex-wrap gap-3">
              <button
                className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-pine/20 hover:bg-pine/5"
                onClick={() =>
                  downloadCsv("interview-table.csv", [
                    ["subjectId", "source1", "source2", "source3", "source4", "source5", "age", "gender"],
                    ...dataset.sessions
                      .filter((session) => session.structuredRecord)
                      .map((session) => {
                        const record = session.structuredRecord!;
                        return [
                          record.subjectId,
                          record.source1,
                          record.source2,
                          record.source3,
                          record.source4,
                          record.source5,
                          record.age,
                          record.gender,
                        ];
                      }),
                  ])
                }
                type="button"
              >
                <Download className="h-4 w-4" />
                Export interview table
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-pine/20 hover:bg-pine/5"
                onClick={() =>
                  downloadCsv("weighted-summary.csv", [
                    [
                      "categoryName",
                      "rank1Count",
                      "rank2Count",
                      "rank3Count",
                      "rank4Count",
                      "rank5Count",
                      "totalCount",
                      "weightedTotal",
                      "weightedPercentage",
                    ],
                    ...dataset.summaryRecords.map((record) => [
                      record.categoryName,
                      record.rank1Count,
                      record.rank2Count,
                      record.rank3Count,
                      record.rank4Count,
                      record.rank5Count,
                      record.totalCount,
                      record.weightedTotal,
                      record.weightedPercentage,
                    ]),
                  ])
                }
                type="button"
              >
                <Download className="h-4 w-4" />
                Export weighted summary
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-ink/8 text-ink/50">
                  <tr>
                    <th className="px-3 py-3 font-medium">Subject ID</th>
                    <th className="px-3 py-3 font-medium">Email</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Step</th>
                    <th className="px-3 py-3 font-medium">Review flags</th>
                    <th className="px-3 py-3 font-medium">Updated</th>
                    <th className="px-3 py-3 font-medium">Review</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSessions.map((session) => (
                    <tr className="border-b border-ink/6" key={session.sessionId}>
                      <td className="px-3 py-4 font-medium text-ink">{session.subjectId}</td>
                      <td className="px-3 py-4 text-ink/70">
                        {session.participantKey?.email ?? "Not collected"}
                      </td>
                      <td className="px-3 py-4 text-ink/70">{session.status}</td>
                      <td className="px-3 py-4 text-ink/70">{STEP_TITLES[session.currentStep]}</td>
                      <td className="px-3 py-4 text-ink/70">
                        {session.followUpReasons.length > 0
                          ? session.followUpReasons.join(", ").replaceAll("_", " ")
                          : session.codingRecords.some((record) => record.finalCategory === null)
                            ? "Needs manual review"
                            : "None"}
                      </td>
                      <td className="px-3 py-4 text-ink/70">{formatDateTime(session.updatedAt)}</td>
                      <td className="px-3 py-4">
                        <Link
                          className="inline-flex items-center gap-2 font-medium text-pine transition hover:text-pine/80"
                          href={`/research/${session.sessionId}`}
                        >
                          Open
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card-surface rounded-[2rem] border border-white/60 p-6 shadow-card">
            <div className="mb-5">
              <p className="text-xs uppercase tracking-[0.24em] text-ink/45">Weighted summary</p>
              <h2 className="font-display text-3xl text-ink">Category totals</h2>
            </div>
            <div className="space-y-4">
              {dataset.summaryRecords.map((record) => (
                <div className="rounded-[1.4rem] border border-ink/10 bg-white/80 p-4" key={record.categoryName}>
                  <div className="mb-2 flex items-center justify-between">
                    <div className="font-semibold text-ink">{record.categoryName}</div>
                    <div className="text-sm text-ink/60">{record.weightedPercentage}%</div>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-ink/8">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-clay to-pine"
                      style={{ width: `${record.weightedPercentage}%` }}
                    />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-ink/60">
                    <div>Total count: {record.totalCount}</div>
                    <div>Weighted total: {record.weightedTotal}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
