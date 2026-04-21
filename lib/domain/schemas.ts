import { z } from "zod";

import {
  CODING_CATEGORIES,
  INTERVIEW_LANGUAGES,
  INTERVIEW_METHODS,
  RECRUITMENT_METHODS,
} from "@/lib/domain/protocol";

export const StepIdSchema = z.enum([
  "intro",
  "eligibility",
  "identity_question",
  "clarification_if_needed",
  "rank_confirmation",
  "demographics",
  "metadata",
  "completed",
  "terminated_ineligible",
]);

export const SessionStatusSchema = z.enum([
  "active",
  "completed",
  "terminated_ineligible",
]);

export const TranscriptRoleSchema = z.enum(["system", "participant", "researcher"]);

export const LanguageCodeSchema = z.enum(["en", "es"]);

export const CodingCategorySchema = z.enum(CODING_CATEGORIES);

export const FollowUpReasonSchema = z.enum([
  "no_stereotype_in_top_five",
  "high_category_ambiguity",
  "low_parser_confidence",
  "sparse_or_unexpected_response",
  "researcher_marked",
]);

export const TranscriptMessageSchema = z.object({
  id: z.string(),
  sessionId: z.string(),
  index: z.number().int().nonnegative(),
  role: TranscriptRoleSchema,
  content: z.string().min(1),
  timestamp: z.string(),
});

export const RankedSourceSchema = z.object({
  rank: z.number().int().min(1).max(5),
  text: z.string().min(1),
});

export const StructuredInterviewRecordSchema = z.object({
  subjectId: z.string(),
  source1: z.string().min(1),
  source2: z.string().min(1),
  source3: z.string().min(1),
  source4: z.string().min(1),
  source5: z.string().min(1),
  age: z.string().min(1),
  gender: z.string().min(1),
});

export const ParticipantKeySchema = z.object({
  subjectId: z.string(),
  name: z.string().min(1),
  age: z.string().min(1),
  gender: z.string().min(1),
  occupation: z.string().min(1),
  email: z.string().email(),
  date: z.string().min(1),
  location: z.string().min(1),
  interviewMethod: z.enum(INTERVIEW_METHODS),
  recruitSource: z.enum(RECRUITMENT_METHODS),
  interviewLanguage: z.enum(INTERVIEW_LANGUAGES),
});

export const CodingRecordSchema = z.object({
  subjectId: z.string(),
  rank: z.number().int().min(1).max(5),
  rawSourceText: z.string().min(1),
  suggestedCategory: CodingCategorySchema.nullable(),
  finalCategory: CodingCategorySchema.nullable(),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
  followUpNeeded: z.boolean(),
});

export const SummaryRecordSchema = z.object({
  categoryName: CodingCategorySchema,
  rank1Count: z.number().int().nonnegative(),
  rank2Count: z.number().int().nonnegative(),
  rank3Count: z.number().int().nonnegative(),
  rank4Count: z.number().int().nonnegative(),
  rank5Count: z.number().int().nonnegative(),
  totalCount: z.number().int().nonnegative(),
  weightedTotal: z.number().nonnegative(),
  weightedPercentage: z.number().nonnegative(),
});

export const InterviewSessionSchema = z.object({
  sessionId: z.string(),
  subjectId: z.string(),
  status: SessionStatusSchema,
  eligibilityResult: z.enum(["eligible", "ineligible", "unknown"]),
  currentStep: StepIdSchema,
  languageCode: LanguageCodeSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  clarificationUsed: z.boolean(),
  identityResponse: z.string().nullable(),
  rankedSourcesRawInput: z.string().nullable(),
  rankedSourcesDraft: z.array(RankedSourceSchema),
  parserConfidence: z.number().min(0).max(1).nullable(),
  parserWarnings: z.array(z.string()),
  transcript: z.array(TranscriptMessageSchema),
  structuredRecord: StructuredInterviewRecordSchema.nullable(),
  participantKey: ParticipantKeySchema.nullable(),
  codingRecords: z.array(CodingRecordSchema),
  followUpReasons: z.array(FollowUpReasonSchema),
  analysisSummary: z.string().nullable().optional().default(null),
  analysisGeneratedAt: z.string().nullable().optional().default(null),
});

export const ResearchDatasetSchema = z.object({
  sessions: z.array(InterviewSessionSchema),
  generatedAt: z.string(),
  summaryRecords: z.array(SummaryRecordSchema),
});

export const DemographicsInputSchema = z.object({
  age: z.string().trim().min(1, "Age is required."),
  gender: z.string().trim().min(1, "Gender is required."),
});

export const MetadataInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  age: z.string().trim().min(1, "Age is required."),
  gender: z.string().trim().min(1, "Gender is required."),
  occupation: z.string().trim().min(1, "Occupation is required."),
  email: z.string().email("A valid email is required."),
  date: z.string().trim().min(1, "Date is required."),
  location: z.string().trim().min(1, "Location is required."),
  interviewMethod: z.enum(INTERVIEW_METHODS),
  recruitSource: z.enum(RECRUITMENT_METHODS),
  interviewLanguage: z.enum(INTERVIEW_LANGUAGES),
});

export const InterviewSubmissionSchema = z.object({
  sessionId: z.string().min(1),
  subjectId: z.string().min(1),
  languageCode: LanguageCodeSchema,
  eligibilityResult: z.enum(["eligible", "ineligible"]),
  clarificationUsed: z.boolean(),
  identityResponse: z.string().nullable(),
  rankedSourcesRawInput: z.string().nullable(),
  rankedSourcesDraft: z.array(RankedSourceSchema),
  parserConfidence: z.number().min(0).max(1).nullable(),
  parserWarnings: z.array(z.string()),
  metadata: MetadataInputSchema.nullable(),
});

export type CodingCategory = z.infer<typeof CodingCategorySchema>;
export type CodingRecord = z.infer<typeof CodingRecordSchema>;
export type DemographicsInput = z.infer<typeof DemographicsInputSchema>;
export type FollowUpReason = z.infer<typeof FollowUpReasonSchema>;
export type InterviewSession = z.infer<typeof InterviewSessionSchema>;
export type InterviewSubmission = z.infer<typeof InterviewSubmissionSchema>;
export type LanguageCode = z.infer<typeof LanguageCodeSchema>;
export type MetadataInput = z.infer<typeof MetadataInputSchema>;
export type ParticipantKey = z.infer<typeof ParticipantKeySchema>;
export type RankedSource = z.infer<typeof RankedSourceSchema>;
export type ResearchDataset = z.infer<typeof ResearchDatasetSchema>;
export type StepId = z.infer<typeof StepIdSchema>;
export type StructuredInterviewRecord = z.infer<
  typeof StructuredInterviewRecordSchema
>;
export type SummaryRecord = z.infer<typeof SummaryRecordSchema>;
export type TranscriptMessage = z.infer<typeof TranscriptMessageSchema>;
