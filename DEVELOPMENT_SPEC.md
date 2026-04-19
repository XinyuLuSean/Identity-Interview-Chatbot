# Identity Interview Chatbot — Development Spec

## 1. Project Overview

This repository is for building a production-quality web app that helps collect, organize, and analyze interview data for the University of Pennsylvania EAS 5120 final paper:

**"Negotiation & Identity: Examining the Validity of Stereotypes"**

The selected study group for this project is:

**Latinos**

The app must support a **strict, controlled interview workflow** that preserves the validity of the assignment methodology. The system should look like a chatbot to the participant, but it must **not behave like a free-form AI interviewer**.

The app exists to solve four practical problems:

1. Collect valid interview data in a consistent way.
2. Store both raw and structured interview records.
3. Help the researcher review and code responses.
4. Support later analysis for the final paper.

---

## 2. Core Research Constraint

This is the most important requirement in the entire project.

The course assignment requires a **standardized interview process**. Therefore:

- The interview flow must be **deterministic**.
- The chatbot must **not improvise core interview questions**.
- The chatbot must **not freely reword the required identity question**.
- The chatbot must **not ask leading questions**.
- The chatbot must **not steer users toward family, culture, ethnicity, religion, or any other identity source**.
- AI can assist with **parsing, structuring, coding suggestions, and later analysis**, but **not with controlling the research question itself**.

This project should be engineered as:

**A chatbot-style interview interface with a fixed protocol and AI-assisted parsing/research support.**

Not as:

**A fully autonomous conversational AI interviewer.**

---

## 3. Product Goal

Build a web application that:

- Presents the interview in a friendly chatbot-style interface.
- Ensures each participant goes through the same required sequence.
- Collects complete usable interview data.
- Saves raw transcript + structured fields to Google Sheets.
- Generates category suggestions for researcher review.
- Produces researcher-facing summary tables for later paper writing.

---

## 4. Primary Users

### 4.1 Researcher / Admin
The researcher is the primary operator of the system.

The researcher needs to:
- start interviews,
- track interview progress,
- review and correct parsed results,
- approve category coding,
- export usable tables for the paper,
- generate weighted summaries,
- identify candidates for follow-up.

### 4.2 Participant / Interviewee
The participant interacts with the chatbot-like interface.

The participant should be able to:
- understand what the study is,
- answer the questions,
- provide ranked identity sources,
- provide demographic and metadata fields,
- finish the interview quickly and clearly.

---

## 5. Research Workflow the Product Must Support

The product must support this exact high-level research flow:

1. Researcher defines study group and sampling plan.
2. Participant is approached in a neutral setting.
3. Participant receives the standard introduction.
4. Participant is screened for eligibility.
5. Participant answers the standard identity question.
6. If needed, participant receives only the approved clarification.
7. Participant provides five ranked identity sources.
8. Participant provides age and gender.
9. Participant metadata is collected.
10. Raw transcript is saved.
11. Structured interview record is created.
12. Researcher later reviews category suggestions.
13. Weighted analysis is generated.
14. Researcher identifies follow-up interviewees if needed.
15. Data is used to write the final paper.

---

## 6. Fixed Interview Protocol

The system must preserve the following interview sequence.

### Step 1 — Introduction
Display the standard study introduction.

The introduction should communicate:
- this is a study on identity,
- conducted by graduate students at the University of Pennsylvania,
- names will not be used in the research,
- email addresses may be collected for follow-up,
- publication depends on findings,
- participants will not be personally identified.

### Step 2 — Eligibility Confirmation
The participant must be asked whether they self-identify as Latino.

If the participant does not qualify, the interview should terminate politely and record the session as ineligible.

### Step 3 — Standard Identity Question
The participant must receive the fixed identity question.

This step is the core of the research protocol.

### Step 4 — Clarification (Only If Needed)
If the participant is confused or stuck, the system may provide only the approved clarification.

No extra examples. No explanatory paraphrasing. No identity prompts.

### Step 5 — Ranked Identity Sources
The system must collect exactly five identity sources, in ranked order from most important to least important.

If the user gives fewer than five, unclear ordering, or merged items, the system should ask for completion/confirmation in a controlled way.

### Step 6 — Demographics
Collect:
- age
- gender

### Step 7 — Metadata
Collect:
- name
- occupation
- email
- date
- location
- method of interview
- how the participant was recruited / located
- interview language

### Step 8 — Completion
The system confirms the interview is complete and thanks the participant.

---

## 7. UX Principles

The participant-facing interface should feel conversational, but the logic must remain controlled.

### Must-have UX qualities
- clean
- minimal
- mobile friendly
- fast
- low cognitive load
- clear progress
- easy to correct mistakes

### Must-have UX behavior
- one clear step at a time
- visible chat bubbles
- participant answers persist if page refreshes
- researcher can recover incomplete sessions
- participant cannot accidentally skip required fields

### Nice-to-have UX features
- progress indicator
- bilingual support toggle (if approved by researcher)
- researcher-only review dashboard
- confirmation screen before final submission

---

## 8. AI Usage Policy

AI is allowed in this project, but only in bounded roles.

### AI is allowed to do:
- parse free text into structured ranked items,
- detect whether the participant has actually provided five sources,
- suggest categories for coding,
- flag ambiguity,
- generate drafts of summary statistics,
- help identify possible follow-up subjects,
- assist researcher-side analysis.

### AI is NOT allowed to do:
- invent identity sources,
- change the core study question,
- conduct free-form probing,
- lead the participant,
- create new interview questions on its own,
- alter the meaning of the protocol,
- replace researcher judgment for final coding.

### Important methodological principle
AI suggestions are **advisory**.
Final research decisions remain human decisions.

---

## 9. Suggested Technology Stack

### Frontend
- Next.js with App Router
- React
- Tailwind CSS
- shadcn/ui

### AI integration
- Vercel AI SDK
- OpenAI model for parsing / coding suggestions / structured analysis

### Backend
- Next.js Route Handlers

### Data storage
- Google Sheets as initial storage and researcher workspace

### Deployment
- Vercel

### Validation / schema
- Zod

---

## 10. System Architecture

The system should be built as four logical layers.

### 10.1 Interview Control Layer
Responsible for:
- interview state machine,
- deterministic step progression,
- protocol enforcement,
- completion checks.

### 10.2 AI Assistance Layer
Responsible for:
- parsing participant answers,
- extracting ranked sources,
- suggesting categories,
- generating summaries.

### 10.3 Data Storage Layer
Responsible for:
- storing session info,
- saving raw transcripts,
- saving structured records,
- saving coding results,
- saving summaries.

### 10.4 Research Review Layer
Responsible for:
- researcher dashboard,
- coding approval,
- ambiguity review,
- weighted analysis,
- export support.

---

## 11. Interview State Machine

The application should behave like a state machine, not a free-form chat model.

Suggested state progression:

1. `intro`
2. `eligibility`
3. `identity_question`
4. `clarification_if_needed`
5. `rank_confirmation`
6. `demographics`
7. `metadata`
8. `completed`
9. `terminated_ineligible`

### Rules
- Each state must define allowed user actions.
- Each state must define validation requirements.
- The system should not move forward until minimum required data for that state is complete.
- The interview must be resumable from the last valid state.

---

## 12. Data Model Requirements

The repository should support at least the following conceptual entities.

### 12.1 Session
Represents one interview session.

Fields should include:
- session ID
- subject ID
- status
- eligibility result
- current step
- created timestamp
- updated timestamp
- completed timestamp

### 12.2 Transcript Message
Represents one message in the interview transcript.

Fields should include:
- session ID
- message index
- role
- content
- timestamp

### 12.3 Structured Interview Record
Represents the usable interview output for the paper.

Fields should include:
- subject ID
- source 1
- source 2
- source 3
- source 4
- source 5
- age
- gender

### 12.4 Participant Key
Represents metadata required for tracking and possible follow-up.

Fields should include:
- subject ID
- name
- occupation
- email
- date
- location
- interview method
- recruit source
- interview language

### 12.5 Coding Record
Represents researcher-side coding results.

Fields should include:
- subject ID
- rank
- raw source text
- suggested category
- final category
- confidence
- rationale
- follow-up needed

### 12.6 Summary Record
Represents weighted category summary data.

Fields should include:
- category name
- counts by rank position
- total count
- weighted total
- weighted percentage

---

## 13. Google Sheets Design

The initial implementation should use multiple tabs in a single Google Sheet.

Suggested tabs:

### `Sessions`
Purpose:
- track one row per session

### `RawTranscript`
Purpose:
- preserve every message in order

### `InterviewTable`
Purpose:
- hold the structured 20-interview table needed for the paper

### `ParticipantKey`
Purpose:
- hold name / occupation / email / date / location / method / recruit source

### `Coding`
Purpose:
- hold category suggestions and final approved coding

### `WeightedSummary`
Purpose:
- hold researcher-facing weighted totals and percentages

### Important rule
Do not rely only on structured parsed data.
The raw transcript must always be preserved.

---

## 14. Research Coding Rules

The app should support six coding categories:

1. Family
2. Friends
3. Occupation
4. Personality
5. Hobbies
6. Stereotype

### Important note
The system may suggest category assignments, but the final category must be reviewed by the researcher.

### Why this matters
Many identity statements are ambiguous and may belong to different categories depending on context.

Examples of ambiguity:
- “hardworking” could be personality or occupation-related.
- national-origin terms may connect to stereotype coding.
- “community” may require contextual judgment.

The system should help, not decide.

---

## 15. Weighted Analysis Requirements

The app must support the required weighted model:

- 1st source = 5 points
- 2nd source = 4 points
- 3rd source = 3 points
- 4th source = 2 points
- 5th source = 1 point

The system should automatically compute:
- counts by category and rank position,
- total category count,
- weighted category total,
- weighted percentage share.

The app should make it easy for the researcher to answer later:
- Did the findings confirm the stereotype?
- Did the findings contradict the stereotype?
- Did the findings complicate the stereotype?

---

## 16. Researcher Dashboard Requirements

The researcher needs a dedicated interface separate from the participant experience.

### Dashboard should support:
- viewing all sessions,
- seeing completion status,
- filtering valid vs invalid interviews,
- reviewing raw transcripts,
- reviewing parsed structured output,
- approving / editing coding suggestions,
- viewing summary tables,
- marking follow-up candidates,
- exporting data.

### High-priority admin functions
- search by subject ID
- search by email
- find incomplete sessions
- find interviews needing manual review
- find interviews needing follow-up

---

## 17. Follow-up Workflow

The project must support a follow-up workflow for cases where responses differ strongly from the stereotype or need clarification.

The system should help the researcher identify follow-up candidates based on signals such as:
- no stereotype-related identity appears in the top five,
- category ambiguity is high,
- parsing confidence is low,
- the response is unusually sparse or unexpected.

The system does not need to automate follow-up interviewing at first, but it should:
- mark follow-up candidates,
- store follow-up reasons,
- make later contact possible using participant metadata.

---

## 18. Bilingual Considerations

The product support English and Spanish, but this must be handled carefully.

### Design principle
Research consistency matters more than convenience.

### bilingual support
- there must be fixed approved phrasing per language,
- the system must not dynamically translate prompts using AI in real time,
- researcher must be able to see the language used for each interview,
- transcript must preserve original language.


---

## 19. Privacy / Security Requirements

This project handles personal information and interview data.

### Security requirements
- store secrets only in environment variables,
- never expose API keys to the client,
- do not write service account credentials into the repository,
- use server-side data writes to Google Sheets,
- separate researcher-only pages from participant pages,
- be mindful that raw transcript contains identifiable information.

### Data handling principle
Collect only what the assignment requires, and preserve it carefully.

---

## 20. Non-Goals for Version 1

The first version does **not** need to:
- perform advanced academic statistical modeling,
- automatically write the final paper,
- replace researcher judgment,
- become a general-purpose survey platform,
- support many study topics beyond this identity project,
- support arbitrary AI-led conversation.

The first version should stay narrow and reliable.

---

## 21. Development Priorities

The coding agent should implement in the following order.

### Phase 1 — Foundation
- initialize project,
- configure frontend styling,
- create app layout,
- define shared schemas,
- define interview protocol constants,
- define interview state machine.

### Phase 2 — Participant Interview Flow
- build participant chat page,
- implement fixed step progression,
- save messages locally or server-side,
- validate required fields,
- handle completion and ineligible exits.

### Phase 3 — Google Sheets Integration
- connect to Google Sheets,
- create write helpers,
- store sessions,
- store raw transcript,
- store structured interview table,
- store participant key.

### Phase 4 — AI Parsing Support
- parse identity-source answers,
- detect incomplete or ambiguous ranked answers,
- structure interview data,
- generate category suggestions.

### Phase 5 — Researcher Dashboard
- view sessions,
- inspect transcripts,
- edit structured records,
- approve category coding.

### Phase 6 — Summary Tools
- compute weighted totals,
- generate category summaries,
- flag follow-up candidates,
- support export.

### Phase 7 — Polish and Deployment
- improve UI,
- test end-to-end,
- deploy to Vercel,
- verify environment variables,
- perform researcher acceptance testing.

---

## 22. Acceptance Criteria

A valid Version 1 should satisfy all of the following.

### Interview validity
- The participant sees the fixed interview sequence.
- The participant cannot skip required parts.
- The system captures exactly five ranked identity sources.
- The system collects age and gender.
- The system collects participant metadata.

### Data integrity
- Raw transcript is preserved.
- Structured record is created.
- Google Sheets receives the correct data.
- Incomplete sessions are distinguishable from completed sessions.

### Research usability
- Researcher can review each interview.
- Researcher can override coding suggestions.
- Weighted summaries can be generated.
- Follow-up candidates can be identified.

### Deployment
- App runs locally.
- App can be deployed on Vercel.
- Secrets are handled safely.

---

## 23. Testing Requirements

The coding agent should include testing and validation thinking throughout development.

### What should be tested
- step progression,
- ineligible path,
- incomplete five-source answers,
- metadata validation,
- transcript persistence,
- Google Sheets writes,
- researcher review edits,
- summary computation.

### Edge cases to think about
- participant gives only 3 sources,
- participant gives 5 items without clear order,
- participant gives one paragraph instead of a list,
- participant refreshes page mid-interview,
- Google Sheets write fails,
- AI parser returns uncertain output,
- user enters partial metadata,
- duplicated sources appear.

---

## 24. Repository Documentation Expectations

This repository should eventually contain documentation for both humans and coding agents.

Suggested future docs:
- `README.md` — project overview and setup
- `DEVELOPMENT_SPEC.md` — this file
- `PROTOCOL.md` — the fixed interview protocol
- `DATA_MODEL.md` — schema and sheet structure
- `DEPLOYMENT.md` — environment and Vercel deployment
- `RESEARCH_NOTES.md` — methodology notes for the researcher

---

## 25. Final Instruction to the Coding Agent

When implementing this repository, prioritize:

1. **methodological correctness**,
2. **deterministic interview control**,
3. **data integrity**,
4. **researcher reviewability**,
5. **simple, reliable user experience**.

If there is ever tension between “more AI freedom” and “better research validity,” choose:

**better research validity**.

If there is ever tension between “smart automation” and “human reviewability,” choose:

**human reviewability**.

The final product should help the researcher collect credible, consistent interview data for the EAS 5120 final paper, while keeping the interface efficient and practical for real-world use.
