"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronRight,
  GripVertical,
  Languages,
  LoaderCircle,
} from "lucide-react";

import {
  GENDER_OPTIONS,
  INTERVIEW_METHODS,
  RECRUITMENT_METHODS,
} from "@/lib/domain/protocol";
import type {
  InterviewSession,
  MetadataInput,
  RankedSource,
  StepId,
} from "@/lib/domain/schemas";
import { cn } from "@/lib/utils";

const SESSION_ID_STORAGE_KEY = "identity-interview-current-session";
const SESSION_CACHE_STORAGE_KEY = "identity-interview-session-cache";

type ApiResponse = {
  session: InterviewSession;
};

type ParticipantCopy = {
  badge: string;
  title: string;
  description: string;
  languageLabel: string;
  continue: string;
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
  loading: string;
  retry: string;
  currentQuestion: string;
  systemLabel: string;
  participantLabel: string;
  progress: string;
  rankLabel: string;
  responsePlaceholder: string;
  rankedPlaceholder: string;
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

const PARTICIPANT_COPY: Record<"en" | "es", ParticipantCopy> = {
  en: {
    badge: "Identity Study",
    title: "Identity Interview",
    description:
      "Please answer each step in order. Your progress will stay on this device if you need to pause and come back later.",
    languageLabel: "Interview language",
    continue: "Continue",
    yesEligible: "Yes",
    noEligible: "No",
    clarify: "I need clarification",
    submitResponse: "Submit response",
    confirmRankedSources: "Confirm ranked sources",
    rankingHelp:
      "Please review the five items below carefully. Edit the text and drag items to rearrange the order before you confirm.",
    moveUp: "Move up",
    moveDown: "Move down",
    dragHandle: "Drag to reorder",
    warningsTitle: "Please double-check these items",
    waiting: "Please wait",
    syncing: "Saving your response...",
    loading: "Preparing your interview...",
    retry: "Try again",
    currentQuestion: "Current question",
    systemLabel: "Study",
    participantLabel: "You",
    progress: "Progress",
    rankLabel: "Rank",
    responsePlaceholder: "Type your response here...",
    rankedPlaceholder: "1. ...\n2. ...\n3. ...\n4. ...\n5. ...",
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
      "Thank you for participating. Your responses have been recorded successfully.",
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
    badge: "Estudio de identidad",
    title: "Entrevista sobre identidad",
    description:
      "Responda cada paso en orden. Su progreso quedará guardado en este dispositivo si necesita pausar y volver después.",
    languageLabel: "Idioma de la entrevista",
    continue: "Continuar",
    yesEligible: "Sí",
    noEligible: "No",
    clarify: "Necesito una aclaración",
    submitResponse: "Enviar respuesta",
    confirmRankedSources: "Confirmar fuentes clasificadas",
    rankingHelp:
      "Revise cuidadosamente los cinco elementos a continuación. Edite el texto y arrastre los elementos para reorganizar el orden antes de confirmar.",
    moveUp: "Mover arriba",
    moveDown: "Mover abajo",
    dragHandle: "Arrastrar para reordenar",
    warningsTitle: "Por favor revise estos puntos",
    waiting: "Espere por favor",
    syncing: "Guardando su respuesta...",
    loading: "Preparando su entrevista...",
    retry: "Intentar de nuevo",
    currentQuestion: "Pregunta actual",
    systemLabel: "Estudio",
    participantLabel: "Usted",
    progress: "Progreso",
    rankLabel: "Rango",
    responsePlaceholder: "Escriba su respuesta aquí...",
    rankedPlaceholder: "1. ...\n2. ...\n3. ...\n4. ...\n5. ...",
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
      "Gracias por participar. Sus respuestas se han registrado correctamente.",
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

function translateWarning(warning: string, languageCode: "en" | "es") {
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
    recruitSource:
      session.participantKey?.recruitSource ?? RECRUITMENT_METHODS[0],
    interviewLanguage: session.languageCode === "es" ? "Spanish" : "English",
  };
}

function readCachedSession() {
  try {
    const raw = window.localStorage.getItem(SESSION_CACHE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as InterviewSession) : null;
  } catch {
    return null;
  }
}

function persistSession(session: InterviewSession) {
  window.localStorage.setItem(SESSION_ID_STORAGE_KEY, session.sessionId);
  window.localStorage.setItem(SESSION_CACHE_STORAGE_KEY, JSON.stringify(session));
}

function clearPersistedSession() {
  window.localStorage.removeItem(SESSION_ID_STORAGE_KEY);
  window.localStorage.removeItem(SESSION_CACHE_STORAGE_KEY);
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
      : Math.max(((stepIndex + 1) / labels.length) * 100, 8);

  return (
    <div className="rounded-[1.8rem] border border-ink/10 bg-white/75 p-4">
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
    </div>
  );
}

function StepInput({
  session,
  onSubmit,
  busy,
  copy,
}: {
  session: InterviewSession;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
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
      return;
    }

  }, [
    session.currentStep,
    session.identityResponse,
    session.rankedSourcesDraft.length,
  ]);

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
        <div className="space-y-5">
          <div className="rounded-[1.8rem] border border-ink/10 bg-white/80 p-5">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-pine">
              <Languages className="h-4 w-4" />
              {copy.languageLabel}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition",
                  session.languageCode === "en"
                    ? "border-pine bg-pine text-white"
                    : "border-ink/10 bg-white text-ink",
                )}
                disabled={busy}
                onClick={() => onSubmit({ action: "set_language", languageCode: "en" })}
                type="button"
              >
                English
              </button>
              <button
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition",
                  session.languageCode === "es"
                    ? "border-pine bg-pine text-white"
                    : "border-ink/10 bg-white text-ink",
                )}
                disabled={busy}
                onClick={() => onSubmit({ action: "set_language", languageCode: "es" })}
                type="button"
              >
                Español
              </button>
            </div>
          </div>
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
            onClick={() => onSubmit({ action: "ack_intro" })}
            type="button"
          >
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
            {busy ? copy.waiting : copy.continue}
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
            className="min-h-32 w-full rounded-[1.8rem] border border-ink/10 bg-white px-4 py-4 text-sm outline-none transition focus:border-clay disabled:cursor-not-allowed disabled:opacity-60"
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
                key={source.rank}
                onDragEnd={() => setDraggedIndex(null)}
                onDragOver={(event) => {
                  event.preventDefault();
                }}
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
                          itemIndex === index
                            ? { ...item, text: event.target.value }
                            : item,
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
            onClick={() =>
              onSubmit({ action: "confirm_ranked_sources", rankedSources })
            }
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
              className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition focus:border-clay disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              onChange={(event) =>
                setMetadata((current) => ({ ...current, date: event.target.value }))
              }
              aria-label={copy.dateLabel}
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
  const [booting, setBooting] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const transcriptBottomRef = useRef<HTMLDivElement | null>(null);

  const copy = PARTICIPANT_COPY[session?.languageCode ?? "en"];
  const busy = booting || isSubmitting;

  async function bootstrapSession(forceNew = false) {
    setError(null);

    if (!forceNew) {
      const cachedSession = readCachedSession();
      if (cachedSession) {
        setSession(cachedSession);
        setBooting(false);
      } else {
        setBooting(true);
      }
    } else {
      setBooting(true);
      clearPersistedSession();
      setSession(null);
    }

    try {
      let resolvedSession: InterviewSession | null = null;
      const storedSessionId = forceNew
        ? null
        : window.localStorage.getItem(SESSION_ID_STORAGE_KEY);

      if (storedSessionId) {
        try {
          const existing = await fetchJson<ApiResponse>(`/api/sessions/${storedSessionId}`);
          resolvedSession = existing.session;
        } catch {
          clearPersistedSession();
        }
      }

      if (!resolvedSession) {
        const created = await fetchJson<ApiResponse>("/api/sessions", {
          method: "POST",
          body: JSON.stringify({ languageCode: "en" }),
        });
        resolvedSession = created.session;
      }

      setSession(resolvedSession);
      persistSession(resolvedSession);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to start the interview.",
      );
    } finally {
      setBooting(false);
    }
  }

  useEffect(() => {
    void bootstrapSession();
  }, []);

  useEffect(() => {
    if (session) {
      persistSession(session);
    }
  }, [session]);

  useEffect(() => {
    transcriptBottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [session?.transcript.length, session?.currentStep]);

  const currentPrompt = useMemo(
    () =>
      [...(session?.transcript ?? [])]
        .reverse()
        .find((message) => message.role === "system")?.content ?? "",
    [session],
  );

  async function handleAction(payload: Record<string, unknown>) {
    if (!session || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      setError(null);
      const next = await fetchJson<ApiResponse>(`/api/sessions/${session.sessionId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setSession(next.session);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to update the interview.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (booting && !session) {
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
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="card-surface w-full max-w-xl rounded-[2rem] border border-white/60 p-8 shadow-card">
          <h1 className="font-display text-3xl text-ink">{copy.title}</h1>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            {error ?? copy.loading}
          </p>
          <button
            className="mt-6 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white"
            onClick={() => void bootstrapSession(true)}
            type="button"
          >
            {copy.retry}
          </button>
        </div>
      </main>
    );
  }

  const isFinished =
    session.currentStep === "completed" || session.currentStep === "terminated_ineligible";

  return (
    <main className="grid-paper min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <section className="card-surface relative overflow-hidden rounded-[2.2rem] border border-white/60 p-5 shadow-card sm:p-8">
          {isSubmitting ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-center bg-mist/75 px-4 py-5 backdrop-blur-[2px]">
              <div className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-2 text-sm text-ink/70 shadow-sm">
                <LoaderCircle className="h-4 w-4 animate-spin text-pine" />
                {copy.syncing}
              </div>
            </div>
          ) : null}

          <div className="space-y-4 border-b border-ink/8 pb-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-pine/15 bg-pine/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-pine">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {copy.badge}
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-4xl leading-tight text-ink sm:text-5xl">
                {copy.title}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-ink/68">{copy.description}</p>
            </div>
            <ProgressBadge copy={copy} step={session.currentStep} />
          </div>

          <div className="mt-6 rounded-[1.8rem] border border-ink/10 bg-white/75 p-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-ink/45">
              {copy.currentQuestion}
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-ink/78">{currentPrompt}</p>
          </div>

          <div className="mt-6 grid gap-4">
            {session.transcript.map((message) => {
              const bubbleLabel =
                message.role === "participant" ? copy.participantLabel : copy.systemLabel;

              return (
                <div
                  className={cn(
                    "conversation-fade max-w-[88%] rounded-[1.7rem] px-5 py-4 text-sm leading-6 shadow-sm",
                    message.role === "participant"
                      ? "ml-auto rounded-br-md bg-pine text-white"
                      : "rounded-bl-md border border-ink/10 bg-white/90 text-ink",
                  )}
                  key={message.id}
                >
                  <div className="mb-1 text-[10px] uppercase tracking-[0.24em] opacity-65">
                    {bubbleLabel}
                  </div>
                  <div className="whitespace-pre-wrap">{message.content}</div>
                </div>
              );
            })}
            <div ref={transcriptBottomRef} />
          </div>

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
              <StepInput busy={busy} copy={copy} onSubmit={handleAction} session={session} />
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
              <button
                className="mt-5 rounded-full bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink/90"
                onClick={() => void bootstrapSession(true)}
                type="button"
              >
                {copy.startAnother}
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
