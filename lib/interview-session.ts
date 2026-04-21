import { createMessageId, createSessionId, createSubjectId } from "@/lib/domain/ids";
import {
  ENGLISH_PROMPTS,
  INTERVIEW_METHODS,
  SPANISH_PROMPTS,
} from "@/lib/domain/protocol";
import type {
  InterviewSession,
  LanguageCode,
  MetadataInput,
  RankedSource,
} from "@/lib/domain/schemas";

function getPrompts(languageCode: LanguageCode) {
  return languageCode === "es" ? SPANISH_PROMPTS : ENGLISH_PROMPTS;
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

function buildStructuredRecord(session: InterviewSession, metadata: MetadataInput) {
  return {
    subjectId: session.subjectId,
    source1: session.rankedSourcesDraft[0].text,
    source2: session.rankedSourcesDraft[1].text,
    source3: session.rankedSourcesDraft[2].text,
    source4: session.rankedSourcesDraft[3].text,
    source5: session.rankedSourcesDraft[4].text,
    age: metadata.age.trim(),
    gender: metadata.gender.trim(),
  };
}

export function createDraftInterviewSession(
  languageCode: LanguageCode,
  seed?: {
    sessionId?: string;
    subjectId?: string;
    createdAt?: string;
  },
): InterviewSession {
  const now = seed?.createdAt ?? new Date().toISOString();
  const session: InterviewSession = {
    sessionId: seed?.sessionId ?? createSessionId(),
    subjectId: seed?.subjectId ?? createSubjectId(),
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
    analysisSummary: null,
    analysisGeneratedAt: null,
  };

  appendTranscript(session, "system", getPrompts(languageCode).intro);
  return session;
}

export function buildSubmittedInterviewSession(input: {
  sessionId: string;
  subjectId: string;
  languageCode: LanguageCode;
  createdAt: string;
  eligibilityResult: "eligible" | "ineligible";
  clarificationUsed: boolean;
  identityResponse: string | null;
  rankedSourcesRawInput: string | null;
  rankedSourcesDraft: RankedSource[];
  parserConfidence: number | null;
  parserWarnings: string[];
  metadata: MetadataInput | null;
}) {
  const session = createDraftInterviewSession(input.languageCode, {
    sessionId: input.sessionId,
    subjectId: input.subjectId,
    createdAt: input.createdAt,
  });
  const prompts = getPrompts(input.languageCode);
  session.updatedAt = new Date().toISOString();
  session.eligibilityResult = input.eligibilityResult;
  session.clarificationUsed = input.clarificationUsed;
  session.identityResponse = input.identityResponse;
  session.rankedSourcesRawInput = input.rankedSourcesRawInput;
  session.rankedSourcesDraft = input.rankedSourcesDraft.map((source, index) => ({
    rank: index + 1,
    text: source.text.trim(),
  }));
  session.parserConfidence = input.parserConfidence;
  session.parserWarnings = [...input.parserWarnings];

  appendTranscript(session, "participant", prompts.introAck);
  appendTranscript(session, "system", prompts.eligibility);
  appendTranscript(
    session,
    "participant",
    input.eligibilityResult === "eligible"
      ? prompts.eligibilityYes
      : prompts.eligibilityNo,
  );

  if (input.eligibilityResult === "ineligible") {
    session.status = "terminated_ineligible";
    session.currentStep = "terminated_ineligible";
    appendTranscript(session, "system", prompts.ineligible);
    return session;
  }

  appendTranscript(session, "system", prompts.identityQuestion);

  if (input.clarificationUsed) {
    appendTranscript(session, "participant", prompts.clarificationRequest);
    appendTranscript(session, "system", prompts.clarification);
  }

  appendTranscript(session, "participant", input.identityResponse ?? "");
  appendTranscript(session, "system", prompts.ranking);
  appendTranscript(
    session,
    "participant",
    session.rankedSourcesDraft.map((source) => `${source.rank}. ${source.text}`).join("\n"),
  );
  appendTranscript(session, "system", prompts.metadata);

  if (!input.metadata) {
    throw new Error("Metadata is required for eligible interviews.");
  }

  session.structuredRecord = buildStructuredRecord(session, input.metadata);
  session.participantKey = {
    subjectId: session.subjectId,
    ...input.metadata,
    interviewMethod: INTERVIEW_METHODS[0],
    interviewLanguage: input.languageCode === "es" ? "Spanish" : "English",
  };

  const labels = getParticipantSummaryLabels(input.languageCode);
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
  session.currentStep = "completed";
  session.completedAt = new Date().toISOString();
  appendTranscript(session, "system", prompts.completed);

  return session;
}
