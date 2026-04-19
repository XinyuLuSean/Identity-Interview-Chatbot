# Apps Script Setup

This repo now supports using a Google Sheet through a bound Google Apps Script web app, so you do not need a Google Cloud service account.

## Environment variables

Set these in `.env.local`:

```bash
STORAGE_BACKEND=apps_script
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
GOOGLE_APPS_SCRIPT_SECRET=choose-a-random-secret
OPENAI_API_KEY=your_openai_key
RESEARCHER_ACCESS_CODE=choose-a-code
```

`GOOGLE_SHEETS_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` are not needed when using `apps_script`.

## Your sheet

Create or use a Google Sheet with these required tabs:

- `Sessions`
- `RawTranscript`
- `InterviewTable`
- `ParticipantKey`
- `Coding`
- `WeightedSummary`

Make sure the header row in each tab matches the CSV templates in `sheet-templates/`.

## Create the bound Apps Script

1. Open your Google Sheet.
2. Click `Extensions` > `Apps Script`.
3. Replace the default script with the code below.
4. Save the project.

Use this exact script:

```javascript
const TAB_NAMES = {
  sessions: "Sessions",
  transcript: "RawTranscript",
  interview: "InterviewTable",
  participantKey: "ParticipantKey",
  coding: "Coding",
  summary: "WeightedSummary",
};

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

function getSecret_() {
  return PropertiesService.getScriptProperties().getProperty("APP_SECRET");
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function parseRequest_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Missing request body.");
  }

  return JSON.parse(e.postData.contents);
}

function requireSecret_(payload) {
  const expected = getSecret_();
  if (!expected) {
    throw new Error("APP_SECRET is not configured in Script Properties.");
  }

  if (payload.secret !== expected) {
    throw new Error("Invalid secret.");
  }
}

function getSheetByName_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) {
    throw new Error(`Missing sheet tab: ${name}`);
  }
  return sheet;
}

function readSheetAsObjects_(name) {
  const sheet = getSheetByName_(name);
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    return [];
  }

  const [headers, ...rows] = values;
  return rows
    .filter((row) => row.some((cell) => String(cell) !== ""))
    .map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[String(header)] = row[index] == null ? "" : String(row[index]);
      });
      return obj;
    });
}

function clearAndWriteSheet_(name, headers, rows) {
  const sheet = getSheetByName_(name);
  sheet.clearContents();

  const allRows = [headers].concat(rows);
  sheet.getRange(1, 1, allRows.length, headers.length).setValues(allRows);
}

function buildDataset_() {
  return {
    sessions: readSheetAsObjects_(TAB_NAMES.sessions).map((row) => ({
      sessionId: row.sessionId,
      subjectId: row.subjectId,
      status: row.status,
      eligibilityResult: row.eligibilityResult,
      currentStep: row.currentStep,
      languageCode: row.languageCode,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt || null,
      clarificationUsed: row.clarificationUsed === "true",
      identityResponse: row.identityResponse || null,
      rankedSourcesRawInput: row.rankedSourcesRawInput || null,
      rankedSourcesDraft: JSON.parse(row.rankedSourcesDraft || "[]"),
      parserConfidence: row.parserConfidence === "" ? null : Number(row.parserConfidence),
      parserWarnings: JSON.parse(row.parserWarnings || "[]"),
      transcript: [],
      structuredRecord: null,
      participantKey: null,
      codingRecords: [],
      followUpReasons: JSON.parse(row.followUpReasons || "[]"),
    })),
    generatedAt: new Date().toISOString(),
    summaryRecords: readSheetAsObjects_(TAB_NAMES.summary).map((row) => ({
      categoryName: row.categoryName,
      rank1Count: Number(row.rank1Count || 0),
      rank2Count: Number(row.rank2Count || 0),
      rank3Count: Number(row.rank3Count || 0),
      rank4Count: Number(row.rank4Count || 0),
      rank5Count: Number(row.rank5Count || 0),
      totalCount: Number(row.totalCount || 0),
      weightedTotal: Number(row.weightedTotal || 0),
      weightedPercentage: Number(row.weightedPercentage || 0),
    })),
  };
}

function attachRelations_(dataset) {
  const transcripts = readSheetAsObjects_(TAB_NAMES.transcript);
  const interviews = readSheetAsObjects_(TAB_NAMES.interview);
  const participants = readSheetAsObjects_(TAB_NAMES.participantKey);
  const codingRows = readSheetAsObjects_(TAB_NAMES.coding);

  const transcriptMap = {};
  transcripts.forEach((row) => {
    if (!transcriptMap[row.sessionId]) transcriptMap[row.sessionId] = [];
    transcriptMap[row.sessionId].push({
      sessionId: row.sessionId,
      id: row.messageId,
      index: Number(row.index),
      role: row.role,
      content: row.content,
      timestamp: row.timestamp,
    });
  });

  const interviewMap = {};
  interviews.forEach((row) => {
    interviewMap[row.subjectId] = {
      subjectId: row.subjectId,
      source1: row.source1,
      source2: row.source2,
      source3: row.source3,
      source4: row.source4,
      source5: row.source5,
      age: row.age,
      gender: row.gender,
    };
  });

  const participantMap = {};
  participants.forEach((row) => {
    participantMap[row.subjectId] = {
      subjectId: row.subjectId,
      name: row.name,
      age: row.age,
      gender: row.gender,
      occupation: row.occupation,
      email: row.email,
      date: row.date,
      location: row.location,
      interviewMethod: row.interviewMethod,
      recruitSource: row.recruitSource,
      interviewLanguage: row.interviewLanguage,
    };
  });

  const codingMap = {};
  codingRows.forEach((row) => {
    if (!codingMap[row.subjectId]) codingMap[row.subjectId] = [];
    codingMap[row.subjectId].push({
      subjectId: row.subjectId,
      rank: Number(row.rank),
      rawSourceText: row.rawSourceText,
      suggestedCategory: row.suggestedCategory || null,
      finalCategory: row.finalCategory || null,
      confidence: Number(row.confidence),
      rationale: row.rationale,
      followUpNeeded: row.followUpNeeded === "true",
    });
  });

  dataset.sessions = dataset.sessions.map((session) => ({
    ...session,
    transcript: (transcriptMap[session.sessionId] || []).sort((a, b) => a.index - b.index),
    structuredRecord: interviewMap[session.subjectId] || null,
    participantKey: participantMap[session.subjectId] || null,
    codingRecords: (codingMap[session.subjectId] || []).sort((a, b) => a.rank - b.rank),
  }));

  return dataset;
}

function writeDataset_(dataset) {
  clearAndWriteSheet_(
    TAB_NAMES.sessions,
    SESSION_HEADERS,
    dataset.sessions.map((session) => [
      session.sessionId,
      session.subjectId,
      session.status,
      session.eligibilityResult,
      session.currentStep,
      session.languageCode,
      session.createdAt,
      session.updatedAt,
      session.completedAt || "",
      String(session.clarificationUsed),
      session.identityResponse || "",
      session.rankedSourcesRawInput || "",
      JSON.stringify(session.rankedSourcesDraft || []),
      session.parserConfidence == null ? "" : String(session.parserConfidence),
      JSON.stringify(session.parserWarnings || []),
      JSON.stringify(session.followUpReasons || []),
    ]),
  );

  clearAndWriteSheet_(
    TAB_NAMES.transcript,
    TRANSCRIPT_HEADERS,
    dataset.sessions.flatMap((session) =>
      (session.transcript || []).map((message) => [
        message.sessionId,
        message.id,
        String(message.index),
        message.role,
        message.content,
        message.timestamp,
      ]),
    ),
  );

  clearAndWriteSheet_(
    TAB_NAMES.interview,
    INTERVIEW_HEADERS,
    dataset.sessions
      .filter((session) => session.structuredRecord)
      .map((session) => {
        const record = session.structuredRecord;
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
  );

  clearAndWriteSheet_(
    TAB_NAMES.participantKey,
    PARTICIPANT_HEADERS,
    dataset.sessions
      .filter((session) => session.participantKey)
      .map((session) => {
        const record = session.participantKey;
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
      }),
  );

  clearAndWriteSheet_(
    TAB_NAMES.coding,
    CODING_HEADERS,
    dataset.sessions.flatMap((session) =>
      (session.codingRecords || []).map((record) => [
        record.subjectId,
        String(record.rank),
        record.rawSourceText,
        record.suggestedCategory || "",
        record.finalCategory || "",
        String(record.confidence),
        record.rationale,
        String(record.followUpNeeded),
      ]),
    ),
  );

  clearAndWriteSheet_(
    TAB_NAMES.summary,
    SUMMARY_HEADERS,
    (dataset.summaryRecords || []).map((record) => [
      record.categoryName,
      String(record.rank1Count),
      String(record.rank2Count),
      String(record.rank3Count),
      String(record.rank4Count),
      String(record.rank5Count),
      String(record.totalCount),
      String(record.weightedTotal),
      String(record.weightedPercentage),
    ]),
  );
}

function doPost(e) {
  try {
    const payload = parseRequest_(e);
    requireSecret_(payload);

    if (payload.action === "read") {
      const dataset = attachRelations_(buildDataset_());
      return jsonResponse_({ ok: true, dataset });
    }

    if (payload.action === "write") {
      writeDataset_(payload.dataset);
      return jsonResponse_({ ok: true });
    }

    return jsonResponse_({ ok: false, error: "Unknown action." });
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error && error.message ? error.message : "Unexpected Apps Script error.",
    });
  }
}
```

## Add the secret in Apps Script

1. In the Apps Script editor, click `Project Settings`.
2. Under `Script Properties`, add:
   - Key: `APP_SECRET`
   - Value: the same random secret you will place in `.env.local` as `GOOGLE_APPS_SCRIPT_SECRET`

## Deploy as a web app

1. Click `Deploy` > `New deployment`.
2. Choose type: `Web app`.
3. Description: anything you want.
4. Execute as: `Me`
5. Who has access: `Anyone`
6. Click `Deploy`
7. Copy the `Web app URL`

Put that URL into `.env.local` as `GOOGLE_APPS_SCRIPT_URL`.

## Update local env

Create or update `.env.local`:

```bash
STORAGE_BACKEND=apps_script
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
GOOGLE_APPS_SCRIPT_SECRET=your-random-secret
OPENAI_API_KEY=your_openai_key
RESEARCHER_ACCESS_CODE=choose-a-code
```

## Important behavior note

This repo writes the full dataset back to all six tabs on each save. That is fine for this project, but if you manually edit rows while an interview is being saved, the app write can overwrite those manual changes.

## After setup

Run:

```bash
npm run dev
```

Then test one interview from `/` and confirm rows appear in all six tabs.
