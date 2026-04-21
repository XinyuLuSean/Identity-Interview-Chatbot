"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  GripVertical,
  LoaderCircle,
} from "lucide-react";

import { createMessageId, createSessionId, createSubjectId } from "@/lib/domain/ids";
import {
  ENGLISH_PROMPTS,
  GENDER_OPTIONS,
  INTERVIEW_METHODS,
  RECRUITMENT_METHODS,
  SPANISH_PROMPTS,
} from "@/lib/domain/protocol";
import {
  getCompletionProgress,
  getNextStep,
  validateIdentityResponse,
  validateMetadata,
  validateRankedSources,
} from "@/lib/domain/state-machine";
import type {
  InterviewSession,
  LanguageCode,
  MetadataInput,
  RankedSource,
  StepId,
} from "@/lib/domain/schemas";
import { cn } from "@/lib/utils";

const SESSION_CACHE_STORAGE_KEY = "identity-interview-session-cache-v2";

type ParsedRankingResponse = {
  rankedSources: RankedSource[];
  confidence: number;
  warnings: string[];
};

type SubmitResponse = {
  session: InterviewSession;
};

type StartInterviewResponse = {
  session: InterviewSession;
};

type LocalAction =
  | { action: "ack_intro" }
  | { action: "quit_intro" }
  | { action: "set_eligibility"; eligible: boolean }
  | { action: "request_clarification" }
  | { action: "submit_identity_response"; response: string }
  | { action: "confirm_ranked_sources"; rankedSources: RankedSource[] }
  | { action: "submit_metadata"; metadata: MetadataInput };

type ParticipantCopy = {
  studyTitle: string;
  studySubtitle: string;
  languageScreenTitle: string;
  languageScreenBody: string;
  chooseEnglish: string;
  chooseSpanish: string;
  chooseEnglishDescription: string;
  chooseSpanishDescription: string;
  continue: string;
  exitInterview: string;
  yesEligible: string;
  noEligible: string;
  clarify: string;
  submitResponse: string;
  confirmRankedSources: string;
  rankingHelp: string;
  moveUp: string;
  moveDown: string;
  dragHandle: string;
  warningsTitle: string;
  waiting: string;
  syncing: string;
  parsing: string;
  finishing: string;
  loading: string;
  retry: string;
  currentQuestion: string;
  yourResponses: string;
  progress: string;
  rankLabel: string;
  responsePlaceholder: string;
  infoCollectionTitle: string;
  nameLabel: string;
  ageLabel: string;
  genderLabel: string;
  occupationLabel: string;
  emailLabel: string;
  dateLabel: string;
  locationLabel: string;
  locationPlaceholder: string;
  methodLabel: string;
  methodValue: string;
  recruitLabel: string;
  languageUsedLabel: string;
  languageUsedEnglish: string;
  languageUsedSpanish: string;
  completeInterview: string;
  completedTitle: string;
  completedBody: string;
  ineligibleTitle: string;
  ineligibleBody: string;
  startAnother: string;
  stepTitles: Record<StepId, string>;
};

const PARTICIPANT_COPY: Record<LanguageCode, ParticipantCopy> = {
  en: {
    studyTitle: "IDENTITY STUDY",
    studySubtitle: "University of Pennsylvania, EAS 5120 Engineering Negotiation",
    languageScreenTitle: "Choose your interview language",
    languageScreenBody:
      "Select the language you want to use for this interview. The study introduction and every following step will appear in that language.",
    chooseEnglish: "English",
    chooseSpanish: "Español",
    chooseEnglishDescription: "Start the interview in English.",
    chooseSpanishDescription: "Comience la entrevista en español.",
    continue: "Continue",
    exitInterview: "Exit interview",
    yesEligible: "Yes",
    noEligible: "No",
    clarify: "I need clarification",
    submitResponse: "Submit response",
    confirmRankedSources: "Confirm ranked sources",
    rankingHelp:
      "Review the five ranked sources below, edit the wording if needed, and drag them into the correct order before you continue.",
    moveUp: "Move up",
    moveDown: "Move down",
    dragHandle: "Drag to reorder",
    warningsTitle: "Please double-check these items",
    waiting: "Please wait",
    syncing: "Saving your interview...",
    parsing: "Reviewing your response...",
    finishing: "Finishing your interview...",
    loading: "Preparing your interview...",
    retry: "Try again",
    currentQuestion: "Current question",
    yourResponses: "Your responses so far",
    progress: "Progress",
    rankLabel: "Rank",
    responsePlaceholder: "Type your response here...",
    infoCollectionTitle: "Interview information",
    nameLabel: "Name",
    ageLabel: "Age",
    genderLabel: "Gender",
    occupationLabel: "Occupation",
    emailLabel: "Email address",
    dateLabel: "Interview date",
    locationLabel: "Current location",
    locationPlaceholder: "Where are you right now? City, state, country",
    methodLabel: "Interview method",
    methodValue: "Interview by web app",
    recruitLabel: "How did you learn about this interview?",
    languageUsedLabel: "Language used for this interview",
    languageUsedEnglish: "English",
    languageUsedSpanish: "Spanish",
    completeInterview: "Complete interview",
    completedTitle: "Interview complete",
    completedBody:
      "Thank you for participating. Your interview has been recorded successfully.",
    ineligibleTitle: "Interview ended",
    ineligibleBody:
      "Thank you for your time. This study only continues with participants who identify as Latino.",
    startAnother: "Start a new interview",
    stepTitles: {
      intro: "Introduction",
      eligibility: "Eligibility",
      identity_question: "Identity question",
      clarification_if_needed: "Clarification",
      rank_confirmation: "Ranking review",
      demographics: "Demographics",
      metadata: "Interview information",
      completed: "Completed",
      terminated_ineligible: "Ended",
    },
  },
  es: {
    studyTitle: "ESTUDIO DE IDENTIDAD",
    studySubtitle: "University of Pennsylvania, EAS 5120 Engineering Negotiation",
    languageScreenTitle: "Elija el idioma de la entrevista",
    languageScreenBody:
      "Seleccione el idioma que desea usar en esta entrevista. La introduccion del estudio y todos los pasos siguientes apareceran en ese idioma.",
    chooseEnglish: "English",
    chooseSpanish: "Español",
    chooseEnglishDescription: "Start the interview in English.",
    chooseSpanishDescription: "Comience la entrevista en español.",
    continue: "Continuar",
    exitInterview: "Salir de la entrevista",
    yesEligible: "Sí",
    noEligible: "No",
    clarify: "Necesito una aclaración",
    submitResponse: "Enviar respuesta",
    confirmRankedSources: "Confirmar fuentes clasificadas",
    rankingHelp:
      "Revise las cinco fuentes clasificadas a continuación, edite la redacción si es necesario y arrástrelas al orden correcto antes de continuar.",
    moveUp: "Mover arriba",
    moveDown: "Mover abajo",
    dragHandle: "Arrastrar para reordenar",
    warningsTitle: "Por favor revise estos puntos",
    waiting: "Espere por favor",
    syncing: "Guardando su entrevista...",
    parsing: "Revisando su respuesta...",
    finishing: "Finalizando su entrevista...",
    loading: "Preparando su entrevista...",
    retry: "Intentar de nuevo",
    currentQuestion: "Pregunta actual",
    yourResponses: "Sus respuestas hasta ahora",
    progress: "Progreso",
    rankLabel: "Rango",
    responsePlaceholder: "Escriba su respuesta aquí...",
    infoCollectionTitle: "Información de la entrevista",
    nameLabel: "Nombre",
    ageLabel: "Edad",
    genderLabel: "Género",
    occupationLabel: "Ocupación",
    emailLabel: "Correo electrónico",
    dateLabel: "Fecha de la entrevista",
    locationLabel: "Ubicación actual",
    locationPlaceholder: "¿Dónde está ahora? Ciudad, estado, país",
    methodLabel: "Método de entrevista",
    methodValue: "Entrevista por aplicación web",
    recruitLabel: "¿Cómo se enteró de esta entrevista?",
    languageUsedLabel: "Idioma utilizado en esta entrevista",
    languageUsedEnglish: "Inglés",
    languageUsedSpanish: "Español",
    completeInterview: "Completar entrevista",
    completedTitle: "Entrevista completa",
    completedBody:
      "Gracias por participar. Su entrevista se registró correctamente.",
    ineligibleTitle: "Entrevista finalizada",
    ineligibleBody:
      "Gracias por su tiempo. Este estudio solo continúa con participantes que se identifican como latinos.",
    startAnother: "Comenzar una nueva entrevista",
    stepTitles: {
      intro: "Introducción",
      eligibility: "Elegibilidad",
      identity_question: "Pregunta de identidad",
      clarification_if_needed: "Aclaración",
      rank_confirmation: "Revisión de clasificación",
      demographics: "Datos demográficos",
      metadata: "Información de la entrevista",
      completed: "Completada",
      terminated_ineligible: "Finalizada",
    },
  },
};

const RECRUITMENT_LABELS = {
  en: {
    "Friend or classmate": "Friend or classmate",
    "Course or instructor": "Course or instructor",
    "Online posting or link": "Online posting or link",
    "Community outreach": "Community outreach",
    Other: "Other",
  },
  es: {
    "Friend or classmate": "Amigo(a) o compañero(a) de clase",
    "Course or instructor": "Curso o instructor(a)",
    "Online posting or link": "Publicación o enlace en línea",
    "Community outreach": "Difusión comunitaria",
    Other: "Otro",
  },
} as const;

const GENDER_LABELS = {
  en: {
    Woman: "Woman",
    Man: "Man",
    "Non-binary": "Non-binary",
    "Another identity": "Another identity",
    "Prefer not to say": "Prefer not to say",
  },
  es: {
    Woman: "Mujer",
    Man: "Hombre",
    "Non-binary": "No binario",
    "Another identity": "Otra identidad",
    "Prefer not to say": "Prefiero no decirlo",
  },
} as const;

function ensureFiveRankedSlots(sources: RankedSource[]) {
  return Array.from({ length: 5 }, (_, index) => ({
    rank: index + 1,
    text: sources.find((source) => source.rank === index + 1)?.text ?? "",
  }));
}

function normalizeRankedSources(sources: RankedSource[]) {
  return sources.map((source, index) => ({
    rank: index + 1,
    text: source.text,
  }));
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || "Unexpected error.");
  }

  return body as T;
}

function getPrompts(languageCode: LanguageCode) {
  return languageCode === "es" ? SPANISH_PROMPTS : ENGLISH_PROMPTS;
}

function buildMetadataState(session: InterviewSession): MetadataInput {
  return {
    name: session.participantKey?.name ?? "",
    age: session.participantKey?.age ?? session.structuredRecord?.age ?? "",
    gender: session.participantKey?.gender ?? session.structuredRecord?.gender ?? "",
    occupation: session.participantKey?.occupation ?? "",
    email: session.participantKey?.email ?? "",
    date: session.participantKey?.date ?? new Date().toISOString().slice(0, 10),
    location: session.participantKey?.location ?? "",
    interviewMethod: INTERVIEW_METHODS[0],
    recruitSource: session.participantKey?.recruitSource ?? RECRUITMENT_METHODS[0],
    interviewLanguage: session.languageCode === "es" ? "Spanish" : "English",
  };
}

function translateWarning(warning: string, languageCode: LanguageCode) {
  if (languageCode === "en") {
    return warning;
  }

  switch (warning) {
    case "Fewer than five sources were detected.":
      return "Se detectaron menos de cinco fuentes.";
    case "Possible duplicate identity sources detected.":
      return "Se detectaron posibles fuentes de identidad duplicadas.";
    case "Some items may contain merged concepts.":
      return "Algunos elementos pueden contener conceptos combinados.";
    default:
      return warning;
  }
}

function readCachedSession() {
  try {
    const raw = window.sessionStorage.getItem(SESSION_CACHE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as InterviewSession) : null;
  } catch {
    return null;
  }
}

function persistSession(session: InterviewSession) {
  window.sessionStorage.setItem(SESSION_CACHE_STORAGE_KEY, JSON.stringify(session));
}

function clearPersistedSession() {
  window.sessionStorage.removeItem(SESSION_CACHE_STORAGE_KEY);
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

function buildStructuredRecord(session: InterviewSession, metadata: MetadataInput) {
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

function cloneSession(session: InterviewSession): InterviewSession {
  return {
    ...session,
    rankedSourcesDraft: session.rankedSourcesDraft.map((source) => ({ ...source })),
    parserWarnings: [...session.parserWarnings],
    transcript: session.transcript.map((message) => ({ ...message })),
    structuredRecord: session.structuredRecord ? { ...session.structuredRecord } : null,
    participantKey: session.participantKey ? { ...session.participantKey } : null,
    codingRecords: session.codingRecords.map((record) => ({ ...record })),
    followUpReasons: [...session.followUpReasons],
  };
}

function createLocalSession(languageCode: LanguageCode): InterviewSession {
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
    analysisSummary: null,
    analysisGeneratedAt: null,
  };

  appendTranscript(session, "system", getPrompts(languageCode).intro);
  return session;
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

function ProgressBadge({
  step,
  copy,
}: {
  step: StepId;
  copy: ParticipantCopy;
}) {
  const labels: StepId[] = [
    "intro",
    "eligibility",
    "identity_question",
    "rank_confirmation",
    "metadata",
    "completed",
  ];
  const stepIndex = labels.indexOf(step);
  const width =
    step === "terminated_ineligible"
      ? 100
      : Math.max((((stepIndex === -1 ? 0 : stepIndex) + 1) / labels.length) * 100, 8);

  return (
    <div className="rounded-[1.8rem] border border-ink/10 bg-white/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3 text-sm text-ink/65">
        <span className="font-medium">{copy.progress}</span>
        <span className="rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-pine">
          {copy.stepTitles[step]}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink/8">
        <div
          className="h-full rounded-full bg-gradient-to-r from-clay to-pine transition-all duration-300"
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="mt-3 text-xs uppercase tracking-[0.18em] text-ink/40">
        {getCompletionProgress(step)}%
      </div>
    </div>
  );
}

function LanguagePicker({
  onSelect,
}: {
  onSelect: (languageCode: LanguageCode) => Promise<void>;
}) {
  const englishCopy = PARTICIPANT_COPY.en;
  const spanishCopy = PARTICIPANT_COPY.es;

  return (
    <main className="grid-paper min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <section className="card-surface rounded-[2.4rem] border border-white/60 p-6 shadow-card sm:p-10">
          <div className="flex flex-col gap-6 border-b border-ink/8 pb-8">
            <div className="flex items-center gap-4">
              <Image
                alt="Penn shield"
                className="h-16 w-16 rounded-2xl bg-[#011F5B] p-1 shadow-sm"
                height="64"
                src="/penn-shield.svg"
                width="64"
              />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#011F5B]">
                  {englishCopy.studyTitle}
                </p>
                <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
                  {englishCopy.languageScreenTitle}
                </h1>
                <p className="mt-1 text-lg text-ink/78">{spanishCopy.languageScreenTitle}</p>
                <p className="mt-3 text-sm text-ink/65">{englishCopy.studySubtitle}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <p className="max-w-xl text-base leading-7 text-ink/72">
                {englishCopy.languageScreenBody}
              </p>
              <p className="max-w-xl text-base leading-7 text-ink/72">
                {spanishCopy.languageScreenBody}
              </p>
            </div>
            <div className="grid gap-3">
              <button
                className="rounded-[1.8rem] border border-[#011F5B]/15 bg-white px-5 py-5 text-left transition hover:border-[#011F5B]/35 hover:bg-[#011F5B]/[0.03]"
                onClick={() => onSelect("en")}
                type="button"
              >
                <div className="text-lg font-semibold text-ink">{englishCopy.chooseEnglish}</div>
                <div className="mt-1 text-sm text-ink/60">{englishCopy.chooseEnglishDescription}</div>
              </button>
              <button
                className="rounded-[1.8rem] border border-[#A51C30]/15 bg-white px-5 py-5 text-left transition hover:border-[#A51C30]/35 hover:bg-[#A51C30]/[0.03]"
                onClick={() => onSelect("es")}
                type="button"
              >
                <div className="text-lg font-semibold text-ink">{englishCopy.chooseSpanish}</div>
                <div className="mt-1 text-sm text-ink/60">{englishCopy.chooseSpanishDescription}</div>
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function StepInput({
  session,
  onSubmit,
  busy,
  copy,
}: {
  session: InterviewSession;
  onSubmit: (payload: LocalAction) => Promise<void>;
  busy: boolean;
  copy: ParticipantCopy;
}) {
  const [textValue, setTextValue] = useState("");
  const [rankedSources, setRankedSources] = useState<RankedSource[]>(
    ensureFiveRankedSlots(session.rankedSourcesDraft),
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [metadata, setMetadata] = useState<MetadataInput>(buildMetadataState(session));

  function moveRankedSource(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex || toIndex < 0 || toIndex >= rankedSources.length) {
      return;
    }

    setRankedSources((current) => {
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return normalizeRankedSources(next);
    });
  }

  useEffect(() => {
    if (session.currentStep === "identity_question" || session.currentStep === "clarification_if_needed") {
      setTextValue(session.identityResponse ?? "");
    }
  }, [session.currentStep, session.identityResponse]);

  useEffect(() => {
    setRankedSources(ensureFiveRankedSlots(session.rankedSourcesDraft));
    setDraggedIndex(null);
  }, [session.rankedSourcesDraft]);

  useEffect(() => {
    setMetadata(buildMetadataState(session));
  }, [session]);

  switch (session.currentStep) {
    case "intro":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={() => onSubmit({ action: "ack_intro" })}
            type="button"
          >
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
            {busy ? copy.waiting : copy.continue}
          </button>
          <button
            className="inline-flex w-full items-center justify-center rounded-full border border-ink/10 bg-white px-5 py-3 text-sm font-medium text-ink transition hover:border-ink/20 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={() => onSubmit({ action: "quit_intro" })}
            type="button"
          >
            {copy.exitInterview}
          </button>
        </div>
      );
    case "eligibility":
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="rounded-[1.8rem] border border-pine/20 bg-pine px-5 py-4 text-left text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={() => onSubmit({ action: "set_eligibility", eligible: true })}
            type="button"
          >
            {copy.yesEligible}
          </button>
          <button
            className="rounded-[1.8rem] border border-ink/10 bg-white px-5 py-4 text-left text-ink transition hover:border-ember/30 hover:bg-ember/5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={() => onSubmit({ action: "set_eligibility", eligible: false })}
            type="button"
          >
            {copy.noEligible}
          </button>
        </div>
      );
    case "identity_question":
    case "clarification_if_needed":
      return (
        <div className="space-y-3">
          <textarea
            className="min-h-36 w-full rounded-[1.8rem] border border-ink/10 bg-white px-4 py-4 text-sm outline-none transition focus:border-clay disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onChange={(event) => setTextValue(event.target.value)}
            placeholder={copy.responsePlaceholder}
            value={textValue}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            {session.currentStep === "identity_question" ? (
              <button
                className="rounded-full border border-ink/10 px-4 py-3 text-sm font-medium text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busy}
                onClick={() => onSubmit({ action: "request_clarification" })}
                type="button"
              >
                {busy ? copy.waiting : copy.clarify}
              </button>
            ) : null}
            <button
              className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              onClick={() =>
                onSubmit({ action: "submit_identity_response", response: textValue })
              }
              type="button"
            >
              {busy ? copy.waiting : copy.submitResponse}
            </button>
          </div>
        </div>
      );
    case "rank_confirmation":
      return (
        <div className="space-y-4">
          <div className="rounded-[1.8rem] border border-clay/20 bg-clay/10 p-4 text-sm leading-6 text-ink/80">
            {copy.rankingHelp}
          </div>
          <div className="grid gap-3">
            {rankedSources.map((source, index) => (
              <div
                className={cn(
                  "rounded-[1.6rem] border border-ink/10 bg-white/85 p-3 transition",
                  draggedIndex === index ? "border-pine/40 bg-pine/5 shadow-sm" : "",
                )}
                draggable={!busy}
                key={`${source.rank}-${index}`}
                onDragEnd={() => setDraggedIndex(null)}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={() => setDraggedIndex(index)}
                onDrop={() => {
                  if (draggedIndex === null) {
                    return;
                  }

                  moveRankedSource(draggedIndex, index);
                  setDraggedIndex(null);
                }}
              >
                <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  <div className="flex items-center gap-2">
                    <button
                      aria-label={copy.dragHandle}
                      className="cursor-grab rounded-full border border-ink/10 bg-white p-2 text-ink/45 transition hover:border-pine/20 hover:text-pine disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={busy}
                      type="button"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <span className="rounded-full bg-sand px-3 py-1 text-sm font-semibold text-ink/70">
                      {copy.rankLabel} {index + 1}
                    </span>
                  </div>

                  <input
                    className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={busy}
                    onChange={(event) =>
                      setRankedSources((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, text: event.target.value } : item,
                        ),
                      )
                    }
                    value={source.text}
                  />

                  <div className="flex items-center gap-2 sm:justify-end">
                    <button
                      aria-label={copy.moveUp}
                      className="rounded-full border border-ink/10 bg-white p-2 text-ink/55 transition hover:border-pine/20 hover:text-pine disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={busy || index === 0}
                      onClick={() => moveRankedSource(index, index - 1)}
                      type="button"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      aria-label={copy.moveDown}
                      className="rounded-full border border-ink/10 bg-white p-2 text-ink/55 transition hover:border-pine/20 hover:text-pine disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={busy || index === rankedSources.length - 1}
                      onClick={() => moveRankedSource(index, index + 1)}
                      type="button"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={() => onSubmit({ action: "confirm_ranked_sources", rankedSources })}
            type="button"
          >
            {busy ? copy.waiting : copy.confirmRankedSources}
          </button>
        </div>
      );
    case "demographics":
      return null;
    case "metadata":
      return (
        <div className="space-y-4">
          <div className="rounded-[1.8rem] border border-ink/10 bg-white/80 p-4">
            <h3 className="font-display text-2xl text-ink">{copy.infoCollectionTitle}</h3>
          </div>
          <div className="grid gap-3">
            <input
              className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              onChange={(event) =>
                setMetadata((current) => ({ ...current, name: event.target.value }))
              }
              placeholder={copy.nameLabel}
              value={metadata.name}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busy}
                inputMode="numeric"
                onChange={(event) =>
                  setMetadata((current) => ({ ...current, age: event.target.value }))
                }
                placeholder={copy.ageLabel}
                value={metadata.age}
              />
              <select
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay disabled:cursor-not-allowed disabled:opacity-60"
                disabled={busy}
                onChange={(event) =>
                  setMetadata((current) => ({ ...current, gender: event.target.value }))
                }
                value={metadata.gender}
              >
                <option value="">{copy.genderLabel}</option>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {GENDER_LABELS[session.languageCode][option]}
                  </option>
                ))}
              </select>
            </div>
            <input
              className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              onChange={(event) =>
                setMetadata((current) => ({ ...current, occupation: event.target.value }))
              }
              placeholder={copy.occupationLabel}
              value={metadata.occupation}
            />
            <input
              className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              onChange={(event) =>
                setMetadata((current) => ({ ...current, email: event.target.value }))
              }
              placeholder={copy.emailLabel}
              type="email"
              value={metadata.email}
            />
            <input
              aria-label={copy.dateLabel}
              className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              onChange={(event) =>
                setMetadata((current) => ({ ...current, date: event.target.value }))
              }
              type="date"
              value={metadata.date}
            />
            <input
              className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              onChange={(event) =>
                setMetadata((current) => ({ ...current, location: event.target.value }))
              }
              placeholder={copy.locationPlaceholder}
              value={metadata.location}
            />
            <div className="rounded-2xl border border-ink/10 bg-sand/40 px-4 py-3 text-sm text-ink/70">
              <div className="mb-1 font-medium text-ink">{copy.methodLabel}</div>
              <div>{copy.methodValue}</div>
            </div>
            <select
              className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              onChange={(event) =>
                setMetadata((current) => ({
                  ...current,
                  recruitSource: event.target.value as MetadataInput["recruitSource"],
                }))
              }
              value={metadata.recruitSource}
            >
              {RECRUITMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {copy.recruitLabel}: {RECRUITMENT_LABELS[session.languageCode][method]}
                </option>
              ))}
            </select>
            <div className="rounded-2xl border border-ink/10 bg-sand/40 px-4 py-3 text-sm text-ink/70">
              <div className="mb-1 font-medium text-ink">{copy.languageUsedLabel}</div>
              <div>
                {session.languageCode === "es"
                  ? copy.languageUsedSpanish
                  : copy.languageUsedEnglish}
              </div>
            </div>
            <button
              className="rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              onClick={() => onSubmit({ action: "submit_metadata", metadata })}
              type="button"
            >
              {busy ? copy.waiting : copy.completeInterview}
            </button>
          </div>
        </div>
      );
    case "completed":
    case "terminated_ineligible":
      return null;
  }
}

export function InterviewShell() {
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hydrating, setHydrating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shouldPersistDraft, setShouldPersistDraft] = useState(true);
  const [busyMessage, setBusyMessage] = useState<string | null>(null);
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cachedSession = readCachedSession();
    if (cachedSession?.status === "active") {
      setSession(cachedSession);
    } else {
      clearPersistedSession();
    }
    setHydrating(false);
  }, []);

  useEffect(() => {
    if (!hydrating && session && shouldPersistDraft) {
      persistSession(session);
    }
  }, [hydrating, session, shouldPersistDraft]);

  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [session?.transcript.length, session?.currentStep]);

  const activeLanguage: LanguageCode = session?.languageCode ?? "en";
  const copy = PARTICIPANT_COPY[activeLanguage];

  const isFinished =
    session?.currentStep === "completed" || session?.currentStep === "terminated_ineligible";

  const conversationMessages = useMemo(() => session?.transcript ?? [], [session]);

  async function finalizeSession(nextSession: InterviewSession) {
    setIsSubmitting(true);
    setError(null);
    setBusyMessage(nextSession.status === "completed" ? copy.finishing : copy.syncing);

    try {
      const saved = await fetchJson<SubmitResponse>("/api/interview/submit", {
        method: "POST",
        body: JSON.stringify({
          submission: {
            sessionId: nextSession.sessionId,
            subjectId: nextSession.subjectId,
            languageCode: nextSession.languageCode,
            eligibilityResult: nextSession.eligibilityResult,
            clarificationUsed: nextSession.clarificationUsed,
            identityResponse: nextSession.identityResponse,
            rankedSourcesRawInput: nextSession.rankedSourcesRawInput,
            rankedSourcesDraft: nextSession.rankedSourcesDraft,
            parserConfidence: nextSession.parserConfidence,
            parserWarnings: nextSession.parserWarnings,
            metadata: nextSession.participantKey
              ? {
                  name: nextSession.participantKey.name,
                  age: nextSession.participantKey.age,
                  gender: nextSession.participantKey.gender,
                  occupation: nextSession.participantKey.occupation,
                  email: nextSession.participantKey.email,
                  date: nextSession.participantKey.date,
                  location: nextSession.participantKey.location,
                  interviewMethod: nextSession.participantKey.interviewMethod,
                  recruitSource: nextSession.participantKey.recruitSource,
                  interviewLanguage: nextSession.participantKey.interviewLanguage,
                }
              : null,
          },
        }),
      });

      setShouldPersistDraft(false);
      clearPersistedSession();
      setSession(saved.session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to submit the interview.");
    } finally {
      setBusyMessage(null);
      setIsSubmitting(false);
    }
  }

  async function startInterview(languageCode: LanguageCode) {
    setError(null);
    setShouldPersistDraft(true);

    try {
      const started = await fetchJson<StartInterviewResponse>("/api/interview/start", {
        method: "POST",
        body: JSON.stringify({ languageCode }),
      });
      setSession(started.session);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start the interview.");
    }
  }

  function resetInterview() {
    setError(null);
    setShouldPersistDraft(true);
    clearPersistedSession();
    setSession(null);
    void fetch("/api/interview/start", { method: "DELETE" }).catch(() => undefined);
  }

  async function handleAction(payload: LocalAction) {
    if (!session || isSubmitting) {
      return;
    }

    const next = cloneSession(session);
    const prompts = getPrompts(next.languageCode);

    switch (payload.action) {
      case "ack_intro": {
        appendTranscript(next, "participant", prompts.introAck);
        updateStep(next, getNextStep(next.currentStep));
        appendTranscript(next, "system", prompts.eligibility);
        setSession(next);
        return;
      }
      case "quit_intro": {
        resetInterview();
        return;
      }
      case "set_eligibility": {
        appendTranscript(
          next,
          "participant",
          payload.eligible ? prompts.eligibilityYes : prompts.eligibilityNo,
        );
        next.eligibilityResult = payload.eligible ? "eligible" : "ineligible";

        if (!payload.eligible) {
          next.status = "terminated_ineligible";
          updateStep(next, "terminated_ineligible");
          appendTranscript(next, "system", prompts.ineligible);
          await finalizeSession(next);
          return;
        }

        updateStep(next, getNextStep(next.currentStep));
        appendTranscript(next, "system", prompts.identityQuestion);
        setSession(next);
        return;
      }
      case "request_clarification": {
        next.clarificationUsed = true;
        updateStep(next, "clarification_if_needed");
        appendTranscript(next, "participant", prompts.clarificationRequest);
        appendTranscript(next, "system", prompts.clarification);
        setSession(next);
        return;
      }
      case "submit_identity_response": {
        if (!validateIdentityResponse(payload.response)) {
          setError("Please provide a more complete identity response.");
          return;
        }

        setIsSubmitting(true);
        setError(null);
        setBusyMessage(copy.parsing);

        try {
          const parsed = await fetchJson<ParsedRankingResponse>("/api/interview/parse", {
            method: "POST",
            body: JSON.stringify({ input: payload.response }),
          });

          next.identityResponse = payload.response.trim();
          next.rankedSourcesRawInput = next.identityResponse;
          appendTranscript(next, "participant", next.identityResponse);
          next.rankedSourcesDraft = parsed.rankedSources;
          next.parserConfidence = parsed.confidence;
          next.parserWarnings = parsed.warnings;
          updateStep(next, "rank_confirmation");
          appendTranscript(next, "system", prompts.ranking);
          setSession(next);
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : "Unable to review the response.");
        } finally {
          setBusyMessage(null);
          setIsSubmitting(false);
        }
        return;
      }
      case "confirm_ranked_sources": {
        if (!validateRankedSources(payload.rankedSources)) {
          setError("Please confirm five distinct ranked identity sources.");
          return;
        }

        next.rankedSourcesDraft = payload.rankedSources.map((source) => ({
          rank: source.rank,
          text: source.text.trim(),
        }));
        next.updatedAt = new Date().toISOString();
        appendTranscript(
          next,
          "participant",
          next.rankedSourcesDraft.map((source) => `${source.rank}. ${source.text}`).join("\n"),
        );
        updateStep(next, getNextStep(next.currentStep));
        appendTranscript(next, "system", prompts.metadata);
        setSession(next);
        return;
      }
      case "submit_metadata": {
        const validation = validateMetadata(payload.metadata);
        if (!validation.success) {
          setError(validation.error.issues[0]?.message ?? "Invalid metadata.");
          return;
        }

        next.structuredRecord = buildStructuredRecord(next, validation.data);
        if (!next.structuredRecord) {
          setError("Five ranked identity sources are required before information collection.");
          return;
        }

        next.participantKey = {
          subjectId: next.subjectId,
          ...validation.data,
          interviewMethod: INTERVIEW_METHODS[0],
          interviewLanguage: next.languageCode === "es" ? "Spanish" : "English",
        };
        const labels = getParticipantSummaryLabels(next.languageCode);
        appendTranscript(
          next,
          "participant",
          [
            `${labels.name}: ${next.participantKey.name}`,
            `${labels.age}: ${next.participantKey.age}`,
            `${labels.gender}: ${next.participantKey.gender}`,
            `${labels.occupation}: ${next.participantKey.occupation}`,
            `${labels.email}: ${next.participantKey.email}`,
            `${labels.date}: ${next.participantKey.date}`,
            `${labels.location}: ${next.participantKey.location}`,
            `${labels.interviewMethod}: ${next.participantKey.interviewMethod}`,
            `${labels.recruitSource}: ${next.participantKey.recruitSource}`,
            `${labels.interviewLanguage}: ${next.participantKey.interviewLanguage}`,
          ].join("\n"),
        );
        next.status = "completed";
        next.completedAt = new Date().toISOString();
        updateStep(next, "completed");
        appendTranscript(next, "system", prompts.completed);
        await finalizeSession(next);
        return;
      }
    }
  }

  if (hydrating) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="card-surface flex items-center gap-3 rounded-full border border-ink/10 px-6 py-4 shadow-card">
          <LoaderCircle className="h-5 w-5 animate-spin text-pine" />
          <span className="text-sm text-ink/70">{copy.loading}</span>
        </div>
      </main>
    );
  }

  if (!session) {
    return <LanguagePicker onSelect={startInterview} />;
  }

  return (
    <main className="grid-paper min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <section className="card-surface relative overflow-hidden rounded-[2.2rem] border border-white/60 p-5 shadow-card sm:p-8">
          {isSubmitting ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center bg-mist/75 px-4 py-5 backdrop-blur-[2px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-sm text-ink/70 shadow-sm">
                <LoaderCircle className="h-4 w-4 animate-spin text-pine" />
                {busyMessage ?? copy.syncing}
              </div>
            </div>
          ) : null}

          <div className="space-y-5 border-b border-ink/8 pb-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Image
                  alt="Penn shield"
                  className="h-16 w-16 rounded-2xl bg-[#011F5B] p-1 shadow-sm"
                  height="64"
                  src="/penn-shield.svg"
                  width="64"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#011F5B]">
                    {copy.studyTitle}
                  </p>
                  <p className="mt-2 text-sm text-ink/62">{copy.studySubtitle}</p>
                </div>
              </div>
              <button
                className="rounded-full border border-ink/10 bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-ink/25"
                onClick={resetInterview}
                type="button"
              >
                {copy.startAnother}
              </button>
            </div>
            <ProgressBadge copy={copy} step={session.currentStep} />
          </div>

          {conversationMessages.length > 0 ? (
            <div className="mt-6">
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-ink/45">
                {copy.yourResponses}
              </div>
              <div className="grid gap-4">
                {conversationMessages.map((message) => (
                  <div
                    className={cn(
                      "conversation-fade max-w-[92%] rounded-[1.7rem] px-5 py-4 text-sm leading-6 shadow-sm",
                      message.role === "participant"
                        ? "ml-auto rounded-br-md bg-pine text-white"
                        : message.role === "researcher"
                          ? "max-w-[88%] rounded-bl-md border border-ember/20 bg-ember/10 text-ink"
                          : "max-w-[88%] rounded-bl-md border border-ink/10 bg-white/90 text-ink",
                    )}
                    key={message.id}
                  >
                    <div className="mb-1 text-[10px] uppercase tracking-[0.24em] opacity-70">
                      {message.role === "participant"
                        ? "You"
                        : message.role === "researcher"
                          ? "Researcher"
                          : activeLanguage === "es"
                            ? "Estudio"
                            : "Study"}
                    </div>
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  </div>
                ))}
                <div ref={transcriptBottomRef} />
              </div>
            </div>
          ) : null}

          {session.parserWarnings.length > 0 && session.currentStep === "rank_confirmation" ? (
            <div className="mt-5 rounded-[1.8rem] border border-ember/20 bg-ember/8 p-4 text-sm text-ink/80">
              <div className="mb-2 font-semibold text-ember">{copy.warningsTitle}</div>
              <ul className="space-y-1">
                {session.parserWarnings.map((warning) => (
                  <li key={warning}>• {translateWarning(warning, session.languageCode)}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 rounded-[1.8rem] border border-ember/20 bg-ember/10 p-4 text-sm text-ember">
              {error}
            </div>
          ) : null}

          {!isFinished ? (
            <div className="mt-6 border-t border-ink/8 pt-6">
              <StepInput
                busy={isSubmitting}
                copy={copy}
                onSubmit={handleAction}
                session={session}
              />
            </div>
          ) : (
            <div className="mt-6 rounded-[1.8rem] border border-pine/20 bg-pine/8 p-6">
              <h2 className="font-display text-3xl text-ink">
                {session.currentStep === "completed"
                  ? copy.completedTitle
                  : copy.ineligibleTitle}
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/72">
                {session.currentStep === "completed"
                  ? copy.completedBody
                  : copy.ineligibleBody}
              </p>
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-pine/15 bg-white px-4 py-2 text-sm font-medium text-pine">
                <CheckCircle2 className="h-4 w-4" />
                {session.subjectId}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
