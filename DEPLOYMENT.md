# Deployment

## Local development

1. Install dependencies with `npm install`
2. Create `.env.local`
3. Set `STORAGE_BACKEND=local`
4. Add any keys you plan to use:
   `OPENAI_API_KEY`
   `RESEARCHER_ACCESS_CODE`
   `GOOGLE_SHEETS_ID`
   `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
   `GOOGLE_APPS_SCRIPT_URL`
   `GOOGLE_APPS_SCRIPT_SECRET`
5. Run `npm run dev`

## Vercel

Recommended production setup:

1. Deploy the Next.js app to Vercel
2. Set environment variables in the Vercel project
3. Use `STORAGE_BACKEND=google`
4. Share the Google Sheet with the service account email
5. Set a strong `RESEARCHER_ACCESS_CODE`

## Required secrets

- `GOOGLE_SHEETS_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- `OPENAI_API_KEY` if AI assistance is enabled
- `RESEARCHER_ACCESS_CODE`

## Notes

- Secrets must remain server-side only.
- Researcher pages are separated and access-code protected.
- Raw transcripts can contain sensitive information and should be handled carefully.
- When copying `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` into `.env.local`, keep the full key as one quoted value and preserve line breaks as `\n`.
- If using Apps Script instead of Google Cloud, set `STORAGE_BACKEND=apps_script` and follow `APPS_SCRIPT_SETUP.md`.
