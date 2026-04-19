import { describe, expect, it } from "vitest";

import { buildSummaryRecords, deriveFollowUpReasons } from "@/lib/domain/analysis";
import type { InterviewSession } from "@/lib/domain/schemas";

function createSession(overrides: Partial<InterviewSession> = {}): InterviewSession {
  return {
    sessionId: "session-1",
    subjectId: "subject-1",
    status: "completed",
    eligibilityResult: "eligible",
    currentStep: "completed",
    languageCode: "en",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    clarificationUsed: false,
    identityResponse: "Family, work, faith, personality, community.",
    rankedSourcesRawInput: "1. Family\n2. Work\n3. Personality\n4. Community\n5. Friends",
    rankedSourcesDraft: [
      { rank: 1, text: "Family" },
      { rank: 2, text: "Work" },
      { rank: 3, text: "Personality" },
      { rank: 4, text: "Community" },
      { rank: 5, text: "Friends" },
    ],
    parserConfidence: 0.88,
    parserWarnings: [],
    transcript: [],
    structuredRecord: {
      subjectId: "subject-1",
      source1: "Family",
      source2: "Work",
      source3: "Personality",
      source4: "Community",
      source5: "Friends",
      age: "31",
      gender: "Female",
    },
    participantKey: {
      subjectId: "subject-1",
      name: "Test User",
      age: "31",
      gender: "Female",
      occupation: "Engineer",
      email: "test@example.com",
      date: "2026-04-19",
      location: "Philadelphia",
      interviewMethod: "In person",
      recruitSource: "In person",
      interviewLanguage: "English",
    },
    codingRecords: [
      {
        subjectId: "subject-1",
        rank: 1,
        rawSourceText: "Family",
        suggestedCategory: "Family",
        finalCategory: "Family",
        confidence: 0.82,
        rationale: "Family keyword match.",
        followUpNeeded: false,
      },
      {
        subjectId: "subject-1",
        rank: 2,
        rawSourceText: "Work",
        suggestedCategory: "Occupation",
        finalCategory: "Occupation",
        confidence: 0.81,
        rationale: "Occupation keyword match.",
        followUpNeeded: false,
      },
      {
        subjectId: "subject-1",
        rank: 3,
        rawSourceText: "Personality",
        suggestedCategory: "Personality",
        finalCategory: "Personality",
        confidence: 0.75,
        rationale: "Personality keyword match.",
        followUpNeeded: false,
      },
      {
        subjectId: "subject-1",
        rank: 4,
        rawSourceText: "Community",
        suggestedCategory: "Friends",
        finalCategory: "Friends",
        confidence: 0.58,
        rationale: "Ambiguous community wording.",
        followUpNeeded: true,
      },
      {
        subjectId: "subject-1",
        rank: 5,
        rawSourceText: "Friends",
        suggestedCategory: "Friends",
        finalCategory: "Friends",
        confidence: 0.84,
        rationale: "Friends keyword match.",
        followUpNeeded: false,
      },
    ],
    followUpReasons: [],
    ...overrides,
  };
}

describe("buildSummaryRecords", () => {
  it("applies weighted totals by category and rank", () => {
    const summary = buildSummaryRecords([createSession()]);
    const family = summary.find((record) => record.categoryName === "Family");
    const friends = summary.find((record) => record.categoryName === "Friends");

    expect(family?.rank1Count).toBe(1);
    expect(family?.weightedTotal).toBe(5);
    expect(friends?.totalCount).toBe(2);
    expect(friends?.weightedTotal).toBe(3);
  });
});


describe("deriveFollowUpReasons", () => {
  it("flags low confidence and lack of stereotype entries", () => {
    const reasons = deriveFollowUpReasons(
      createSession().codingRecords,
      0.52,
      5,
    );

    expect(reasons).toContain("no_stereotype_in_top_five");
    expect(reasons).toContain("low_parser_confidence");
    expect(reasons).toContain("high_category_ambiguity");
  });
});
