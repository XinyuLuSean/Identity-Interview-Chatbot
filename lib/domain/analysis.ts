import { CODING_CATEGORIES, RANK_WEIGHTS } from "@/lib/domain/protocol";
import type {
  CodingCategory,
  CodingRecord,
  FollowUpReason,
  InterviewSession,
  SummaryRecord,
} from "@/lib/domain/schemas";

export function buildSummaryRecords(sessions: InterviewSession[]): SummaryRecord[] {
  const eligibleCompleted = sessions.filter(
    (session) => session.status === "completed" && session.eligibilityResult === "eligible",
  );

  const counters = new Map<
    CodingCategory,
    { rankCounts: number[]; totalCount: number; weightedTotal: number }
  >();

  for (const category of CODING_CATEGORIES) {
    counters.set(category, {
      rankCounts: [0, 0, 0, 0, 0],
      totalCount: 0,
      weightedTotal: 0,
    });
  }

  for (const session of eligibleCompleted) {
    for (const record of session.codingRecords) {
      const category = record.finalCategory ?? record.suggestedCategory;
      if (!category) {
        continue;
      }

      const counter = counters.get(category);
      if (!counter) {
        continue;
      }

      counter.rankCounts[record.rank - 1] += 1;
      counter.totalCount += 1;
      counter.weightedTotal += RANK_WEIGHTS[record.rank - 1];
    }
  }

  const weightedSum = Array.from(counters.values()).reduce(
    (sum, entry) => sum + entry.weightedTotal,
    0,
  );

  return CODING_CATEGORIES.map((category) => {
    const entry = counters.get(category)!;

    return {
      categoryName: category,
      rank1Count: entry.rankCounts[0],
      rank2Count: entry.rankCounts[1],
      rank3Count: entry.rankCounts[2],
      rank4Count: entry.rankCounts[3],
      rank5Count: entry.rankCounts[4],
      totalCount: entry.totalCount,
      weightedTotal: entry.weightedTotal,
      weightedPercentage:
        weightedSum === 0 ? 0 : Number(((entry.weightedTotal / weightedSum) * 100).toFixed(2)),
    };
  });
}

export function deriveFollowUpReasons(
  codingRecords: CodingRecord[],
  parserConfidence: number | null,
  rankedSourceCount: number,
): FollowUpReason[] {
  const reasons = new Set<FollowUpReason>();

  if (!codingRecords.some((record) => record.finalCategory === "Stereotype" || record.suggestedCategory === "Stereotype")) {
    reasons.add("no_stereotype_in_top_five");
  }

  if (parserConfidence !== null && parserConfidence < 0.7) {
    reasons.add("low_parser_confidence");
  }

  if (codingRecords.some((record) => record.confidence < 0.6)) {
    reasons.add("high_category_ambiguity");
  }

  if (rankedSourceCount < 5) {
    reasons.add("sparse_or_unexpected_response");
  }

  return Array.from(reasons);
}

export function countSessionsByStatus(sessions: InterviewSession[]) {
  return {
    total: sessions.length,
    completed: sessions.filter((session) => session.status === "completed").length,
    active: sessions.filter((session) => session.status === "active").length,
    ineligible: sessions.filter((session) => session.status === "terminated_ineligible").length,
    followUp: sessions.filter((session) => session.followUpReasons.length > 0).length,
  };
}

