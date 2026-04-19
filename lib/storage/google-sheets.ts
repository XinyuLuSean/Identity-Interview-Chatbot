import { google } from "googleapis";

import { buildSummaryRecords } from "@/lib/domain/analysis";
import {
  CodingCategorySchema,
  CodingRecordSchema,
  FollowUpReasonSchema,
  InterviewSessionSchema,
  ParticipantKeySchema,
  RankedSourceSchema,
  ResearchDatasetSchema,
  StructuredInterviewRecordSchema,
  SummaryRecordSchema,
  TranscriptMessageSchema,
  type CodingRecord,
  type InterviewSession,
  type ParticipantKey,
  type RankedSource,
  type ResearchDataset,
  type StructuredInterviewRecord,
  type SummaryRecord,
  type TranscriptMessage,
} from "@/lib/domain/schemas";
import type { StorageAdapter } from "@/lib/storage/repository";

const TAB_NAMES = {
  sessions: "Sessions",
  transcript: "RawTranscript",
  interview: "InterviewTable",
  participantKey: "ParticipantKey",
  coding: "Coding",
  summary: "WeightedSummary",
} as const;

const SESSION_HEADERS = [
  "sessionId",
  "subjectId",
  "status",
  "eligibilityResult",
  "currentStep",
  "languageCode",
  "createdAt",
  "updatedAt",
  "completedAt",
  "clarificationUsed",
  "identityResponse",
  "rankedSourcesRawInput",
  "rankedSourcesDraft",
  "parserConfidence",
  "parserWarnings",
  "followUpReasons",
];

const TRANSCRIPT_HEADERS = [
  "sessionId",
  "messageId",
  "index",
  "role",
  "content",
  "timestamp",
];

const INTERVIEW_HEADERS = [
  "subjectId",
  "source1",
  "source2",
  "source3",
  "source4",
  "source5",
  "age",
  "gender",
];

const PARTICIPANT_HEADERS = [
  "subjectId",
  "name",
  "age",
  "gender",
  "occupation",
  "email",
  "date",
  "location",
  "interviewMethod",
  "recruitSource",
  "interviewLanguage",
];

const CODING_HEADERS = [
  "subjectId",
  "rank",
  "rawSourceText",
  "suggestedCategory",
  "finalCategory",
  "confidence",
  "rationale",
  "followUpNeeded",
];

const SUMMARY_HEADERS = [
  "categoryName",
  "rank1Count",
  "rank2Count",
  "rank3Count",
  "rank4Count",
  "rank5Count",
  "totalCount",
  "weightedTotal",
  "weightedPercentage",
];

function parseBoolean(value: unknown) {
  return String(value).toLowerCase() === "true";
}

function parseNumber(value: unknown) {
  const result = Number(value);
  return Number.isNaN(result) ? null : result;
}

function createSheetsClient() {
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (
    !process.env.GOOGLE_SHEETS_ID ||
    !process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ||
    !privateKey
  ) {
    throw new Error("Google Sheets environment variables are not fully configured.");
  }

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

async function getTabValues(tabName: string) {
  const sheets = createSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_ID,
    range: `${tabName}!A:Z`,
  });

  return response.data.values ?? [];
}

function rowsToObjects(rows: string[][]) {
  const [header = [], ...dataRows] = rows;
  return dataRows.map((row) =>
    Object.fromEntries(header.map((key, index) => [key, row[index] ?? ""])),
  );
}

function reconstructSessions(
  sessionRows: Record<string, string>[],
  transcriptRows: Record<string, string>[],
  interviewRows: Record<string, string>[],
  participantRows: Record<string, string>[],
  codingRows: Record<string, string>[],
): InterviewSession[] {
  const transcriptMap = new Map<string, TranscriptMessage[]>();
  const interviewMap = new Map<string, StructuredInterviewRecord>();
  const participantMap = new Map<string, ParticipantKey>();
  const codingMap = new Map<string, CodingRecord[]>();

  for (const row of transcriptRows) {
    const message = TranscriptMessageSchema.parse({
      sessionId: row.sessionId,
      id: row.messageId,
      index: Number(row.index),
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
    });

    const existing = transcriptMap.get(row.sessionId) ?? [];
    existing.push(message);
    transcriptMap.set(row.sessionId, existing);
  }

  for (const row of interviewRows) {
    const record = StructuredInterviewRecordSchema.parse({
      subjectId: row.subjectId,
      source1: row.source1,
      source2: row.source2,
      source3: row.source3,
      source4: row.source4,
      source5: row.source5,
      age: row.age,
      gender: row.gender,
    });

    interviewMap.set(record.subjectId, record);
  }

  for (const row of participantRows) {
    const record = ParticipantKeySchema.parse(row);
    participantMap.set(record.subjectId, record);
  }

  for (const row of codingRows) {
    const record = CodingRecordSchema.parse({
      subjectId: row.subjectId,
      rank: Number(row.rank),
      rawSourceText: row.rawSourceText,
      suggestedCategory: row.suggestedCategory
        ? CodingCategorySchema.parse(row.suggestedCategory)
        : null,
      finalCategory: row.finalCategory ? CodingCategorySchema.parse(row.finalCategory) : null,
      confidence: Number(row.confidence),
      rationale: row.rationale,
      followUpNeeded: parseBoolean(row.followUpNeeded),
    });

    const existing = codingMap.get(record.subjectId) ?? [];
    existing.push(record);
    codingMap.set(record.subjectId, existing);
  }

  return sessionRows.map((row) =>
    InterviewSessionSchema.parse({
      sessionId: row.sessionId,
      subjectId: row.subjectId,
      status: row.status,
      eligibilityResult: row.eligibilityResult,
      currentStep: row.currentStep,
      languageCode: row.languageCode,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt || null,
      clarificationUsed: parseBoolean(row.clarificationUsed),
      identityResponse: row.identityResponse || null,
      rankedSourcesRawInput: row.rankedSourcesRawInput || null,
      rankedSourcesDraft: RankedSourceSchema.array().parse(
        JSON.parse(row.rankedSourcesDraft || "[]"),
      ),
      parserConfidence: parseNumber(row.parserConfidence),
      parserWarnings: JSON.parse(row.parserWarnings || "[]"),
      transcript: (transcriptMap.get(row.sessionId) ?? []).sort((a, b) => a.index - b.index),
      structuredRecord: interviewMap.get(row.subjectId) ?? null,
      participantKey: participantMap.get(row.subjectId) ?? null,
      codingRecords: (codingMap.get(row.subjectId) ?? []).sort((a, b) => a.rank - b.rank),
      followUpReasons: FollowUpReasonSchema.array().parse(
        JSON.parse(row.followUpReasons || "[]"),
      ),
    }),
  );
}

function flattenDataset(dataset: ResearchDataset) {
  const sessions = dataset.sessions.map((session) => [
    session.sessionId,
    session.subjectId,
    session.status,
    session.eligibilityResult,
    session.currentStep,
    session.languageCode,
    session.createdAt,
    session.updatedAt,
    session.completedAt ?? "",
    String(session.clarificationUsed),
    session.identityResponse ?? "",
    session.rankedSourcesRawInput ?? "",
    JSON.stringify(session.rankedSourcesDraft),
    session.parserConfidence?.toString() ?? "",
    JSON.stringify(session.parserWarnings),
    JSON.stringify(session.followUpReasons),
  ]);

  const transcript = dataset.sessions.flatMap((session) =>
    session.transcript.map((message) => [
      message.sessionId,
      message.id,
      String(message.index),
      message.role,
      message.content,
      message.timestamp,
    ]),
  );

  const interviewTable = dataset.sessions
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
    });

  const participantKey = dataset.sessions
    .filter((session) => session.participantKey)
    .map((session) => {
      const record = session.participantKey!;
      return [
        record.subjectId,
        record.name,
        record.age,
        record.gender,
        record.occupation,
        record.email,
        record.date,
        record.location,
        record.interviewMethod,
        record.recruitSource,
        record.interviewLanguage,
      ];
    });

  const coding = dataset.sessions.flatMap((session) =>
    session.codingRecords.map((record) => [
      record.subjectId,
      String(record.rank),
      record.rawSourceText,
      record.suggestedCategory ?? "",
      record.finalCategory ?? "",
      String(record.confidence),
      record.rationale,
      String(record.followUpNeeded),
    ]),
  );

  const summary = dataset.summaryRecords.map((record) => [
    record.categoryName,
    String(record.rank1Count),
    String(record.rank2Count),
    String(record.rank3Count),
    String(record.rank4Count),
    String(record.rank5Count),
    String(record.totalCount),
    String(record.weightedTotal),
    String(record.weightedPercentage),
  ]);

  return {
    sessions: [SESSION_HEADERS, ...sessions],
    transcript: [TRANSCRIPT_HEADERS, ...transcript],
    interviewTable: [INTERVIEW_HEADERS, ...interviewTable],
    participantKey: [PARTICIPANT_HEADERS, ...participantKey],
    coding: [CODING_HEADERS, ...coding],
    summary: [SUMMARY_HEADERS, ...summary],
  };
}

export class GoogleSheetsStorageAdapter implements StorageAdapter {
  async readDataset(): Promise<ResearchDataset> {
    const [sessionRows, transcriptRows, interviewRows, participantRows, codingRows, summaryRows] =
      await Promise.all([
        getTabValues(TAB_NAMES.sessions),
        getTabValues(TAB_NAMES.transcript),
        getTabValues(TAB_NAMES.interview),
        getTabValues(TAB_NAMES.participantKey),
        getTabValues(TAB_NAMES.coding),
        getTabValues(TAB_NAMES.summary),
      ]);

    const sessions = reconstructSessions(
      rowsToObjects(sessionRows),
      rowsToObjects(transcriptRows),
      rowsToObjects(interviewRows),
      rowsToObjects(participantRows),
      rowsToObjects(codingRows),
    );

    const providedSummary = rowsToObjects(summaryRows).map((row) =>
      SummaryRecordSchema.parse({
        categoryName: row.categoryName,
        rank1Count: Number(row.rank1Count),
        rank2Count: Number(row.rank2Count),
        rank3Count: Number(row.rank3Count),
        rank4Count: Number(row.rank4Count),
        rank5Count: Number(row.rank5Count),
        totalCount: Number(row.totalCount),
        weightedTotal: Number(row.weightedTotal),
        weightedPercentage: Number(row.weightedPercentage),
      }),
    );

    return ResearchDatasetSchema.parse({
      sessions,
      generatedAt: new Date().toISOString(),
      summaryRecords:
        providedSummary.length > 0 ? providedSummary : buildSummaryRecords(sessions),
    });
  }

  async writeDataset(dataset: ResearchDataset): Promise<void> {
    const sheets = createSheetsClient();
    const flattened = flattenDataset({
      ...dataset,
      summaryRecords: buildSummaryRecords(dataset.sessions),
    });

    await sheets.spreadsheets.values.batchClear({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      requestBody: {
        ranges: Object.values(TAB_NAMES).map((tab) => `${tab}!A:Z`),
      },
    });

    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEETS_ID,
      requestBody: {
        valueInputOption: "RAW",
        data: [
          { range: `${TAB_NAMES.sessions}!A1`, values: flattened.sessions },
          { range: `${TAB_NAMES.transcript}!A1`, values: flattened.transcript },
          { range: `${TAB_NAMES.interview}!A1`, values: flattened.interviewTable },
          { range: `${TAB_NAMES.participantKey}!A1`, values: flattened.participantKey },
          { range: `${TAB_NAMES.coding}!A1`, values: flattened.coding },
          { range: `${TAB_NAMES.summary}!A1`, values: flattened.summary },
        ],
      },
    });
  }
}
