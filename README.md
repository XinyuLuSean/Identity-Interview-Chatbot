# Identity Interview Chatbot

A production-quality Next.js web app for collecting, organizing, and analyzing interview data for the University of Pennsylvania EAS 5120 final paper:

**Negotiation & Identity: Examining the Validity of Stereotypes**

This implementation is intentionally built as a **deterministic interview workflow**, not a free-form AI interviewer. The participant experience is chat-like, but the protocol is fixed, resumable, reviewable, and designed to preserve research validity.

## What’s included

- Participant interview flow with fixed protocol enforcement
- Resumable session state with transcript preservation
- Structured interview record generation
- Researcher dashboard with transcript review and coding approval
- Weighted summary calculations for the six coding categories
- Optional Google Sheets persistence adapter
- Optional OpenAI-assisted ranked-source parsing and category suggestions

## Stack

- Next.js App Router
- React
- Tailwind CSS
- Zod
- Next.js Route Handlers
- Google Sheets adapter
- OpenAI / Vercel AI SDK hooks with heuristic fallback

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Start the app:

```bash
npm run dev
```

4. Open:

```text
http://localhost:3000
```

Participant interview: `/`

Researcher dashboard: `/research`

## Environment variables

See `.env.example`.

Key variables:

- `STORAGE_BACKEND=local` for local JSON persistence in `data/research-dataset.json`
- `STORAGE_BACKEND=apps_script` to use a bound Google Apps Script web app
- `STORAGE_BACKEND=google` to use the Google Sheets adapter
- `OPENAI_API_KEY` to enable AI parsing/coding suggestions
- `GOOGLE_SHEETS_ID` for the destination Google Sheet
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` for the service account that can edit the sheet
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` for that service account
- `GOOGLE_APPS_SCRIPT_URL` for the deployed Apps Script web app
- `GOOGLE_APPS_SCRIPT_SECRET` for the shared secret between the app and Apps Script
- `RESEARCHER_ACCESS_CODE` to protect the researcher dashboard

Enter these values in `.env.local` during local development, or in the Vercel project environment settings in deployment.

## Google Sheets import templates

Header-only CSV templates for the exact tab formats expected by the app are in:

- `sheet-templates/Sessions.csv`
- `sheet-templates/RawTranscript.csv`
- `sheet-templates/InterviewTable.csv`
- `sheet-templates/ParticipantKey.csv`
- `sheet-templates/Coding.csv`
- `sheet-templates/WeightedSummary.csv`

Import each CSV into a separate tab with the matching tab name, then share the sheet with the service-account email before switching `STORAGE_BACKEND=google`.

## Apps Script option

If you want to avoid Google Cloud service accounts, use the built-in Apps Script path instead:

- Set `STORAGE_BACKEND=apps_script`
- Follow `APPS_SCRIPT_SETUP.md`

## Documentation

- `DEVELOPMENT_SPEC.md`
- `PROTOCOL.md`
- `DATA_MODEL.md`
- `DEPLOYMENT.md`
