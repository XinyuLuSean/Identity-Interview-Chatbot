import { z } from "zod";

import {
  DemographicsInputSchema,
  type DemographicsInput,
  type InterviewSession,
  MetadataInputSchema,
  type MetadataInput,
  type RankedSource,
  type StepId,
} from "@/lib/domain/schemas";

export const STEP_SEQUENCE: StepId[] = [
  "intro",
  "eligibility",
  "identity_question",
  "clarification_if_needed",
  "rank_confirmation",
  "demographics",
  "metadata",
  "completed",
  "terminated_ineligible",
];

export function getNextStep(step: StepId): StepId {
  switch (step) {
    case "intro":
      return "eligibility";
    case "eligibility":
      return "identity_question";
    case "identity_question":
      return "rank_confirmation";
    case "clarification_if_needed":
      return "rank_confirmation";
    case "rank_confirmation":
      return "metadata";
    case "demographics":
      return "metadata";
    case "metadata":
      return "completed";
    case "completed":
      return "completed";
    case "terminated_ineligible":
      return "terminated_ineligible";
  }
}

export function canRequestClarification(session: InterviewSession) {
  return session.currentStep === "identity_question";
}

export function validateIdentityResponse(value: string) {
  return value.trim().length >= 10;
}

export function validateRankedSources(value: RankedSource[]) {
  if (value.length !== 5) {
    return false;
  }

  const uniqueValues = new Set(value.map((item) => item.text.trim().toLowerCase()));
  return uniqueValues.size === 5 && value.every((item) => item.text.trim().length > 0);
}

export function validateDemographics(
  value: DemographicsInput,
): z.SafeParseReturnType<DemographicsInput, DemographicsInput> {
  return DemographicsInputSchema.safeParse(value);
}

export function validateMetadata(
  value: MetadataInput,
): z.SafeParseReturnType<MetadataInput, MetadataInput> {
  return MetadataInputSchema.safeParse(value);
}

export function getCompletionProgress(step: StepId) {
  const orderedSteps: StepId[] = [
    "intro",
    "eligibility",
    "identity_question",
    "rank_confirmation",
    "metadata",
    "completed",
  ];

  const index = orderedSteps.indexOf(step);
  const normalizedIndex = index === -1 ? 0 : index;
  return Math.round((normalizedIndex / (orderedSteps.length - 1)) * 100);
}
