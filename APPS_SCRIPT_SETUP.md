# Apps Script Setup

This repo supports using a Google Sheet through a bound Google Apps Script web app, without Google Cloud service accounts.

This version uses **atomic row-level session writes** for the live interview flow:

- one session row is upserted by `sessionId`
- transcript rows are replaced only for that `sessionId`
- structured interview, participant key, and coding rows are replaced only for that `subjectId`
- `WeightedSummary` is recomputed after each session write
- writes are protected with `LockService.getDocumentLock()`

That makes the Apps Script path much safer for concurrent participant traffic than the original whole-dataset rewrite approach.

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

## Required sheet tabs

Use a Google Sheet with these exact tabs:

- `Sessions`
- `RawTranscript`
- `InterviewTable`
- `ParticipantKey`
- `Coding`
- `WeightedSummary`

Make sure the header row in each tab matches the CSV templates in `sheet-templates/`.

## Replace the bound Apps Script

1. Open your Google Sheet
2. Click `Extensions` > `Apps Script`
3. Replace the default script with the code below
4. Save the project

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

const CODING_CATEGORIES = [
  "Family",
  "Friends",
  "Occupation",
  "Personality",
  "Hobbies",
  "Stereotype",
];

const RANK_WEIGHTS = [5, 4, 3, 2, 1];

function getSecret_() {
  return PropertiesService.getScriptProperties().getProperty("APP_SECRET");
}

function jsonResponse_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
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

function withDocumentLock_(fn) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);

  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function getSheetByName_(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) {
    throw new Error(`Missing sheet tab: ${name}`);
  }

  return sheet;
}

function readSheetRows_(name) {
  const sheet = getSheetByName_(name);
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    return { headers: [], rows: [] };
  }

  return {
    headers: values[0].map((cell) => String(cell)),
    rows: values.slice(1),
  };
}

function readSheetAsObjects_(name) {
  const { headers, rows } = readSheetRows_(name);
  if (headers.length === 0) {
    return [];
  }

  return rows
    .filter((row) => row.some((cell) => String(cell) !== ""))
    .map((row) => {
      const obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index] == null ? "" : String(row[index]);
      });
      return obj;
    });
}

function objectToRow_(headers, record) {
  return headers.map((header) =>
    record[header] == null ? "" : String(record[header]),
  );
}

function upsertRowByField_(name, headers, keyField, record) {
  const sheet = getSheetByName_(name);
  const { headers: existingHeaders, rows } = readSheetRows_(name);
  const finalHeaders = existingHeaders.length > 0 ? existingHeaders : headers;
  const keyIndex = finalHeaders.indexOf(keyField);

  if (keyIndex === -1) {
    throw new Error(`Missing key field ${keyField} in ${name}`);
  }

  const rowValues = objectToRow_(finalHeaders, record);
  let targetRowNumber = -1;

  rows.forEach((row, index) => {
    if (String(row[keyIndex]) === String(record[keyField])) {
      targetRowNumber = index + 2;
    }
  });

  if (existingHeaders.length === 0) {
    sheet.getRange(1, 1, 1, finalHeaders.length).setValues([finalHeaders]);
  }

  if (targetRowNumber === -1) {
    targetRowNumber = Math.max(sheet.getLastRow() + 1, 2);
  }

  sheet.getRange(targetRowNumber, 1, 1, finalHeaders.length).setValues([rowValues]);
}

function removeRowsByField_(name, keyField, keyValue) {
  const sheet = getSheetByName_(name);
  const { headers, rows } = readSheetRows_(name);
  const keyIndex = headers.indexOf(keyField);

  if (keyIndex === -1) {
    throw new Error(`Missing key field ${keyField} in ${name}`);
  }

  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (String(rows[index][keyIndex]) === String(keyValue)) {
      sheet.deleteRow(index + 2);
    }
  }
}

function replaceRowsByField_(name, headers, keyField, keyValue, records) {
  removeRowsByField_(name, keyField, keyValue);

  if (!records || records.length === 0) {
    const sheet = getSheetByName_(name);
    const { headers: existingHeaders } = readSheetRows_(name);
    if (existingHeaders.length === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    return;
  }

  const sheet = getSheetByName_(name);
  const { headers: existingHeaders } = readSheetRows_(name);
  const finalHeaders = existingHeaders.length > 0 ? existingHeaders : headers;

  if (existingHeaders.length === 0) {
    sheet.getRange(1, 1, 1, finalHeaders.length).setValues([finalHeaders]);
  }

  const startRow = Math.max(sheet.getLastRow() + 1, 2);
  const values = records.map((record) => objectToRow_(finalHeaders, record));
  sheet.getRange(startRow, 1, values.length, finalHeaders.length).setValues(values);
}

function replaceSingleOptionalRow_(name, headers, keyField, keyValue, record) {
  removeRowsByField_(name, keyField, keyValue);

  if (!record) {
    const sheet = getSheetByName_(name);
    const { headers: existingHeaders } = readSheetRows_(name);
    if (existingHeaders.length === 0) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    return;
  }

  upsertRowByField_(name, headers, keyField, record);
}

function parseSessionRow_(row) {
  return {
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
  };
}

function buildSessionFromRows_(sessionRow, transcriptRows, interviewRow, participantRow, codingRows) {
  if (!sessionRow) {
    return null;
  }

  return {
    ...parseSessionRow_(sessionRow),
    transcript: transcriptRows
      .map((row) => ({
        sessionId: row.sessionId,
        id: row.messageId,
        index: Number(row.index),
        role: row.role,
        content: row.content,
        timestamp: row.timestamp,
      }))
      .sort((a, b) => a.index - b.index),
    structuredRecord: interviewRow
      ? {
          subjectId: interviewRow.subjectId,
          source1: interviewRow.source1,
          source2: interviewRow.source2,
          source3: interviewRow.source3,
          source4: interviewRow.source4,
          source5: interviewRow.source5,
          age: interviewRow.age,
          gender: interviewRow.gender,
        }
      : null,
    participantKey: participantRow
      ? {
          subjectId: participantRow.subjectId,
          name: participantRow.name,
          age: participantRow.age,
          gender: participantRow.gender,
          occupation: participantRow.occupation,
          email: participantRow.email,
          date: participantRow.date,
          location: participantRow.location,
          interviewMethod: participantRow.interviewMethod,
          recruitSource: participantRow.recruitSource,
          interviewLanguage: participantRow.interviewLanguage,
        }
      : null,
    codingRecords: codingRows
      .map((row) => ({
        subjectId: row.subjectId,
        rank: Number(row.rank),
        rawSourceText: row.rawSourceText,
        suggestedCategory: row.suggestedCategory || null,
        finalCategory: row.finalCategory || null,
        confidence: Number(row.confidence),
        rationale: row.rationale,
        followUpNeeded: row.followUpNeeded === "true",
      }))
      .sort((a, b) => a.rank - b.rank),
  };
}

function getSessionByIdLocked_(sessionId) {
  const sessionRows = readSheetAsObjects_(TAB_NAMES.sessions);
  const sessionRow = sessionRows.find((row) => row.sessionId === sessionId);
  if (!sessionRow) {
    return null;
  }

  const subjectId = sessionRow.subjectId;
  const transcriptRows = readSheetAsObjects_(TAB_NAMES.transcript).filter(
    (row) => row.sessionId === sessionId,
  );
  const interviewRow = readSheetAsObjects_(TAB_NAMES.interview).find(
    (row) => row.subjectId === subjectId,
  );
  const participantRow = readSheetAsObjects_(TAB_NAMES.participantKey).find(
    (row) => row.subjectId === subjectId,
  );
  const codingRows = readSheetAsObjects_(TAB_NAMES.coding).filter(
    (row) => row.subjectId === subjectId,
  );

  return buildSessionFromRows_(
    sessionRow,
    transcriptRows,
    interviewRow,
    participantRow,
    codingRows,
  );
}

function buildDatasetLocked_() {
  const sessionRows = readSheetAsObjects_(TAB_NAMES.sessions);
  const transcriptRows = readSheetAsObjects_(TAB_NAMES.transcript);
  const interviewRows = readSheetAsObjects_(TAB_NAMES.interview);
  const participantRows = readSheetAsObjects_(TAB_NAMES.participantKey);
  const codingRows = readSheetAsObjects_(TAB_NAMES.coding);
  const summaryRows = readSheetAsObjects_(TAB_NAMES.summary);

  const transcriptMap = {};
  transcriptRows.forEach((row) => {
    if (!transcriptMap[row.sessionId]) transcriptMap[row.sessionId] = [];
    transcriptMap[row.sessionId].push(row);
  });

  const interviewMap = {};
  interviewRows.forEach((row) => {
    interviewMap[row.subjectId] = row;
  });

  const participantMap = {};
  participantRows.forEach((row) => {
    participantMap[row.subjectId] = row;
  });

  const codingMap = {};
  codingRows.forEach((row) => {
    if (!codingMap[row.subjectId]) codingMap[row.subjectId] = [];
    codingMap[row.subjectId].push(row);
  });

  const sessions = sessionRows
    .map((sessionRow) =>
      buildSessionFromRows_(
        sessionRow,
        transcriptMap[sessionRow.sessionId] || [],
        interviewMap[sessionRow.subjectId] || null,
        participantMap[sessionRow.subjectId] || null,
        codingMap[sessionRow.subjectId] || [],
      ),
    )
    .filter(Boolean)
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  return {
    sessions,
    generatedAt: new Date().toISOString(),
    summaryRecords: summaryRows.map((row) => ({
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

function recomputeSummaryLocked_() {
  const codingRows = readSheetAsObjects_(TAB_NAMES.coding);
  const summaryMap = {};

  CODING_CATEGORIES.forEach((category) => {
    summaryMap[category] = {
      categoryName: category,
      rank1Count: 0,
      rank2Count: 0,
      rank3Count: 0,
      rank4Count: 0,
      rank5Count: 0,
      totalCount: 0,
      weightedTotal: 0,
      weightedPercentage: 0,
    };
  });

  codingRows.forEach((row) => {
    const category = row.finalCategory || row.suggestedCategory;
    const rank = Number(row.rank);

    if (!category || !summaryMap[category] || !rank || rank < 1 || rank > 5) {
      return;
    }

    const summary = summaryMap[category];
    summary[`rank${rank}Count`] += 1;
    summary.totalCount += 1;
    summary.weightedTotal += RANK_WEIGHTS[rank - 1];
  });

  const totalWeighted = CODING_CATEGORIES.reduce(
    (sum, category) => sum + summaryMap[category].weightedTotal,
    0,
  );

  const summaryRows = CODING_CATEGORIES.map((category) => {
    const summary = summaryMap[category];
    return {
      ...summary,
      weightedPercentage:
        totalWeighted === 0
          ? 0
          : Number(((summary.weightedTotal / totalWeighted) * 100).toFixed(2)),
    };
  });

  const sheet = getSheetByName_(TAB_NAMES.summary);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, SUMMARY_HEADERS.length).setValues([SUMMARY_HEADERS]);
  if (summaryRows.length > 0) {
    sheet
      .getRange(2, 1, summaryRows.length, SUMMARY_HEADERS.length)
      .setValues(summaryRows.map((row) => objectToRow_(SUMMARY_HEADERS, row)));
  }
}

function upsertSessionLocked_(session) {
  upsertRowByField_(TAB_NAMES.sessions, SESSION_HEADERS, "sessionId", {
    sessionId: session.sessionId,
    subjectId: session.subjectId,
    status: session.status,
    eligibilityResult: session.eligibilityResult,
    currentStep: session.currentStep,
    languageCode: session.languageCode,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    completedAt: session.completedAt || "",
    clarificationUsed: String(session.clarificationUsed),
    identityResponse: session.identityResponse || "",
    rankedSourcesRawInput: session.rankedSourcesRawInput || "",
    rankedSourcesDraft: JSON.stringify(session.rankedSourcesDraft || []),
    parserConfidence:
      session.parserConfidence == null ? "" : String(session.parserConfidence),
    parserWarnings: JSON.stringify(session.parserWarnings || []),
    followUpReasons: JSON.stringify(session.followUpReasons || []),
  });

  replaceRowsByField_(
    TAB_NAMES.transcript,
    TRANSCRIPT_HEADERS,
    "sessionId",
    session.sessionId,
    (session.transcript || []).map((message) => ({
      sessionId: message.sessionId,
      messageId: message.id,
      index: String(message.index),
      role: message.role,
      content: message.content,
      timestamp: message.timestamp,
    })),
  );

  replaceSingleOptionalRow_(
    TAB_NAMES.interview,
    INTERVIEW_HEADERS,
    "subjectId",
    session.subjectId,
    session.structuredRecord
      ? {
          subjectId: session.structuredRecord.subjectId,
          source1: session.structuredRecord.source1,
          source2: session.structuredRecord.source2,
          source3: session.structuredRecord.source3,
          source4: session.structuredRecord.source4,
          source5: session.structuredRecord.source5,
          age: session.structuredRecord.age,
          gender: session.structuredRecord.gender,
        }
      : null,
  );

  replaceSingleOptionalRow_(
    TAB_NAMES.participantKey,
    PARTICIPANT_HEADERS,
    "subjectId",
    session.subjectId,
    session.participantKey
      ? {
          subjectId: session.participantKey.subjectId,
          name: session.participantKey.name,
          age: session.participantKey.age,
          gender: session.participantKey.gender,
          occupation: session.participantKey.occupation,
          email: session.participantKey.email,
          date: session.participantKey.date,
          location: session.participantKey.location,
          interviewMethod: session.participantKey.interviewMethod,
          recruitSource: session.participantKey.recruitSource,
          interviewLanguage: session.participantKey.interviewLanguage,
        }
      : null,
  );

  replaceRowsByField_(
    TAB_NAMES.coding,
    CODING_HEADERS,
    "subjectId",
    session.subjectId,
    (session.codingRecords || []).map((record) => ({
      subjectId: record.subjectId,
      rank: String(record.rank),
      rawSourceText: record.rawSourceText,
      suggestedCategory: record.suggestedCategory || "",
      finalCategory: record.finalCategory || "",
      confidence: String(record.confidence),
      rationale: record.rationale,
      followUpNeeded: String(record.followUpNeeded),
    })),
  );

  recomputeSummaryLocked_();
  return getSessionByIdLocked_(session.sessionId);
}

function doPost(e) {
  try {
    const payload = parseRequest_(e);
    requireSecret_(payload);

    if (payload.action === "read_dataset") {
      return withDocumentLock_(() =>
        jsonResponse_({ ok: true, dataset: buildDatasetLocked_() }),
      );
    }

    if (payload.action === "get_session") {
      return withDocumentLock_(() =>
        jsonResponse_({
          ok: true,
          session: getSessionByIdLocked_(payload.sessionId),
        }),
      );
    }

    if (payload.action === "upsert_session") {
      return withDocumentLock_(() =>
        jsonResponse_({
          ok: true,
          session: upsertSessionLocked_(payload.session),
        }),
      );
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

## Script Properties

In Apps Script:

1. Click `Project Settings`
2. Under `Script Properties`, add:
   - Key: `APP_SECRET`
   - Value: the same value you will use in `.env.local` as `GOOGLE_APPS_SCRIPT_SECRET`

## Deploy as a web app

1. Click `Deploy` > `Manage deployments`
2. Edit your existing web app deployment, or create a new one
3. Use:
   - `Execute as: Me`
   - `Who has access: Anyone`
4. Deploy
5. Copy the web app URL

If you update the script later, make sure you **redeploy** the web app so Vercel starts using the new atomic version.

## Local `.env.local`

```bash
STORAGE_BACKEND=apps_script
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
GOOGLE_APPS_SCRIPT_SECRET=your-random-secret
OPENAI_API_KEY=your_openai_key
RESEARCHER_ACCESS_CODE=choose-a-code
```

## Important behavior notes

- This version is much safer for concurrent participant traffic than the old full-sheet rewrite.
- It is still Google Sheets, so it is not as robust as a real database under heavy load.
- Use one browser/device per participant session.
- Keep the Apps Script secret strong, because the web app is deployed as `Anyone`.

## After updating the script

1. Redeploy the Apps Script web app
2. Confirm Vercel still points to the same `GOOGLE_APPS_SCRIPT_URL`
3. Test two browser sessions at once to verify both interviews save correctly
