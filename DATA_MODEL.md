# Data Model

## Core entities

### Session

- `sessionId`
- `subjectId`
- `status`
- `eligibilityResult`
- `currentStep`
- `languageCode`
- `createdAt`
- `updatedAt`
- `completedAt`
- `clarificationUsed`
- `identityResponse`
- `rankedSourcesRawInput`
- `rankedSourcesDraft`
- `parserConfidence`
- `parserWarnings`
- `followUpReasons`

### Transcript message

- `sessionId`
- `id`
- `index`
- `role`
- `content`
- `timestamp`

### Structured interview record

- `subjectId`
- `source1` through `source5`
- `age`
- `gender`

### Participant key

- `subjectId`
- `name`
- `age`
- `gender`
- `occupation`
- `email`
- `date`
- `location`
- `interviewMethod`
- `recruitSource`
- `interviewLanguage`

### Coding record

- `subjectId`
- `rank`
- `rawSourceText`
- `suggestedCategory`
- `finalCategory`
- `confidence`
- `rationale`
- `followUpNeeded`

### Summary record

- `categoryName`
- `rank1Count` through `rank5Count`
- `totalCount`
- `weightedTotal`
- `weightedPercentage`

## Local persistence

When `STORAGE_BACKEND=local`, the app persists to:

- `data/research-dataset.json`

## Google Sheets tabs

- `Sessions`
- `RawTranscript`
- `InterviewTable`
- `ParticipantKey`
- `Coding`
- `WeightedSummary`

## Import templates

Ready-to-import CSV headers live in `sheet-templates/`.
