import { createMessageId, createSessionId, createSubjectId } from "@/lib/domain/ids";
import {
  deriveFollowUpReasons,
} from "@/lib/domain/analysis";
import {
  ENGLISH_PROMPTS,
  INTERVIEW_METHODS,
  SPANISH_PROMPTS,
} from "@/lib/domain/protocol";
import {
  getCompletionProgress,
  getNextStep,
  validateIdentityResponse,
  validateMetadata,
  validateRankedSources,
} from "@/lib/domain/state-machine";
import {
  type CodingRecord,
  type InterviewSession,
  type LanguageCode,
  type MetadataInput,
  type RankedSource,
  type StepId,
} from "@/lib/domain/schemas";
import { parseRankedSources, suggestCodingRecords } from "@/lib/ai/parser";
import { getStorageAdapter } from "@/lib/storage";
import { getDataset, getSessionById, upsertSession } from "@/lib/storage/repository";

type SessionAction =
  | { action: "set_language"; languageCode: LanguageCode }
  | { action: "ack_intro" }
  | { action: "set_eligibility"; eligible: boolean }
  | { action: "request_clarification" }
  | { action: "submit_identity_response"; response: string }
  | { action: "confirm_ranked_sources"; rankedSources: RankedSource[] }
  | {
      action: "submit_metadata";
      metadata: MetadataInput;
    };

type ResearcherUpdateInput = {
  structuredRecord?: InterviewSession["structuredRecord"];
  participantKey?: InterviewSession["participantKey"];
  codingRecords?: CodingRecord[];
  followUpReasons?: InterviewSession["followUpReasons"];
};

function getPrompts(languageCode: LanguageCode) {
  return languageCode === "es" ? SPANISH_PROMPTS : ENGLISH_PROMPTS;
}

function getParticipantSummaryLabels(languageCode: LanguageCode) {
  if (languageCode === "es") {
    return {
      name: "Nombre",
      age: "Edad",
      gender: "Género",
      occupation: "Ocupación",
      email: "Correo electrónico",
      date: "Fecha de la entrevista",
      location: "Ubicación actual",
      interviewMethod: "Método de entrevista",
      recruitSource: "Cómo se enteró de esta entrevista",
      interviewLanguage: "Idioma utilizado en esta entrevista",
    };
  }

  return {
    name: "Name",
    age: "Age",
    gender: "Gender",
    occupation: "Occupation",
    email: "Email",
    date: "Interview date",
    location: "Current location",
    interviewMethod: "Interview method",
    recruitSource: "How you learned about this interview",
    interviewLanguage: "Language used for this interview",
  };
}

function appendTranscript(
  session: InterviewSession,
  role: "system" | "participant" | "researcher",
  content: string,
) {
  const index = session.transcript.length;
  session.transcript.push({
    id: createMessageId(session.sessionId, index),
    sessionId: session.sessionId,
    index,
    role,
    content,
    timestamp: new Date().toISOString(),
  });
}

function updateStep(session: InterviewSession, step: StepId) {
  session.currentStep = step;
  session.updatedAt = new Date().toISOString();
}

function buildStructuredRecord(
  session: InterviewSession,
  metadata: MetadataInput,
) {
  const sources = session.rankedSourcesDraft;
  if (sources.length !== 5) {
    return null;
  }

  return {
    subjectId: session.subjectId,
    source1: sources[0].text,
    source2: sources[1].text,
    source3: sources[2].text,
    source4: sources[3].text,
    source5: sources[4].text,
    age: metadata.age.trim(),
    gender: metadata.gender.trim(),
  };
}

function ensureCurrentStep(session: InterviewSession, allowedSteps: StepId[]) {
  if (!allowedSteps.includes(session.currentStep)) {
    throw new Error(`Action is not allowed while session is in ${session.currentStep}.`);
  }
}

export async function createSession(languageCode: LanguageCode = "en") {
  const now = new Date().toISOString();
  const session: InterviewSession = {
    sessionId: createSessionId(),
    subjectId: createSubjectId(),
    status: "active",
    eligibilityResult: "unknown",
    currentStep: "intro",
    languageCode,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    clarificationUsed: false,
    identityResponse: null,
    rankedSourcesRawInput: null,
    rankedSourcesDraft: [],
    parserConfidence: null,
    parserWarnings: [],
    transcript: [],
    structuredRecord: null,
    participantKey: null,
    codingRecords: [],
    followUpReasons: [],
  };

  appendTranscript(session, "system", getPrompts(languageCode).intro);

  const adapter = getStorageAdapter();
  return upsertSession(adapter, session);
}

export async function getSession(sessionId: string) {
  return getSessionById(getStorageAdapter(), sessionId);
}

export async function listSessions() {
  const dataset = await getDataset(getStorageAdapter());
  return dataset.sessions;
}

export async function getResearchDataset() {
  return getDataset(getStorageAdapter());
}

export async function advanceSession(sessionId: string, input: SessionAction) {
  const adapter = getStorageAdapter();
  const session = await getSessionById(adapter, sessionId);

  if (!session) {
    throw new Error("Session not found.");
  }

  const prompts = getPrompts(session.languageCode);

  switch (input.action) {
    case "set_language": {
      ensureCurrentStep(session, ["intro"]);
      session.languageCode = input.languageCode;
      session.transcript = [];
      appendTranscript(session, "system", getPrompts(input.languageCode).intro);
      session.updatedAt = new Date().toISOString();
      break;
    }
    case "ack_intro": {
      ensureCurrentStep(session, ["intro"]);
      appendTranscript(session, "participant", prompts.introAck);
      updateStep(session, getNextStep(session.currentStep));
      appendTranscript(session, "system", prompts.eligibility);
      break;
    }
    case "set_eligibility": {
      ensureCurrentStep(session, ["eligibility"]);
      appendTranscript(
        session,
        "participant",
        input.eligible ? prompts.eligibilityYes : prompts.eligibilityNo,
      );
      session.eligibilityResult = input.eligible ? "eligible" : "ineligible";

      if (!input.eligible) {
        session.status = "terminated_ineligible";
        updateStep(session, "terminated_ineligible");
        appendTranscript(session, "system", prompts.ineligible);
      } else {
        updateStep(session, getNextStep(session.currentStep));
        appendTranscript(session, "system", prompts.identityQuestion);
      }
      break;
    }
    case "request_clarification": {
      ensureCurrentStep(session, ["identity_question"]);
      session.clarificationUsed = true;
      updateStep(session, "clarification_if_needed");
      appendTranscript(session, "participant", prompts.clarificationRequest);
      appendTranscript(session, "system", prompts.clarification);
      break;
    }
    case "submit_identity_response": {
      ensureCurrentStep(session, ["identity_question", "clarification_if_needed"]);
      if (!validateIdentityResponse(input.response)) {
        throw new Error("Please provide a more complete identity response.");
      }

      session.identityResponse = input.response.trim();
      session.rankedSourcesRawInput = session.identityResponse;
      appendTranscript(session, "participant", session.identityResponse);

      const parsed = await parseRankedSources(session.identityResponse);
      session.rankedSourcesDraft = parsed.rankedSources;
      session.parserConfidence = parsed.confidence;
      session.parserWarnings = parsed.warnings;

      updateStep(session, "rank_confirmation");
      appendTranscript(session, "system", prompts.ranking);
      break;
    }
    case "confirm_ranked_sources": {
      ensureCurrentStep(session, ["rank_confirmation"]);
      if (!validateRankedSources(input.rankedSources)) {
        throw new Error("Please confirm five distinct ranked identity sources.");
      }

      session.rankedSourcesDraft = input.rankedSources.map((source) => ({
        rank: source.rank,
        text: source.text.trim(),
      }));
      session.codingRecords = await suggestCodingRecords(
        session.subjectId,
        session.rankedSourcesDraft,
      );
      session.followUpReasons = deriveFollowUpReasons(
        session.codingRecords,
        session.parserConfidence,
        session.rankedSourcesDraft.length,
      );
      session.updatedAt = new Date().toISOString();
      appendTranscript(
        session,
        "participant",
        session.rankedSourcesDraft
          .map((source) => `${source.rank}. ${source.text}`)
          .join("\n"),
      );
      updateStep(session, getNextStep(session.currentStep));
      appendTranscript(session, "system", prompts.metadata);
      break;
    }
    case "submit_metadata": {
      ensureCurrentStep(session, ["metadata"]);
      const validation = validateMetadata(input.metadata);
      if (!validation.success) {
        throw new Error(validation.error.issues[0]?.message ?? "Invalid metadata.");
      }

      session.structuredRecord = buildStructuredRecord(session, validation.data);
      if (!session.structuredRecord) {
        throw new Error("Five ranked identity sources are required before information collection.");
      }

      session.participantKey = {
        subjectId: session.subjectId,
        ...validation.data,
        interviewMethod: INTERVIEW_METHODS[0],
        interviewLanguage: session.languageCode === "es" ? "Spanish" : "English",
      };
      const labels = getParticipantSummaryLabels(session.languageCode);
      appendTranscript(
        session,
        "participant",
        [
          `${labels.name}: ${session.participantKey.name}`,
          `${labels.age}: ${session.participantKey.age}`,
          `${labels.gender}: ${session.participantKey.gender}`,
          `${labels.occupation}: ${session.participantKey.occupation}`,
          `${labels.email}: ${session.participantKey.email}`,
          `${labels.date}: ${session.participantKey.date}`,
          `${labels.location}: ${session.participantKey.location}`,
          `${labels.interviewMethod}: ${session.participantKey.interviewMethod}`,
          `${labels.recruitSource}: ${session.participantKey.recruitSource}`,
          `${labels.interviewLanguage}: ${session.participantKey.interviewLanguage}`,
        ].join("\n"),
      );
      session.status = "completed";
      session.completedAt = new Date().toISOString();
      updateStep(session, "completed");
      appendTranscript(session, "system", prompts.completed);
      break;
    }
  }

  return upsertSession(adapter, session);
}

export async function updateResearchSession(
  sessionId: string,
  input: ResearcherUpdateInput,
) {
  const adapter = getStorageAdapter();
  const session = await getSessionById(adapter, sessionId);

  if (!session) {
    throw new Error("Session not found.");
  }

  if (input.structuredRecord) {
    session.structuredRecord = input.structuredRecord;
  }

  if (input.participantKey) {
    session.participantKey = input.participantKey;
  }

  if (input.codingRecords) {
    session.codingRecords = input.codingRecords;
  }

  if (input.followUpReasons) {
    session.followUpReasons = input.followUpReasons;
  }

  session.updatedAt = new Date().toISOString();
  appendTranscript(
    session,
    "researcher",
    "Researcher updated the review record.",
  );

  return upsertSession(adapter, session);
}

export function getSessionProgressLabel(session: InterviewSession) {
  return `${getCompletionProgress(session.currentStep)}%`;
}
