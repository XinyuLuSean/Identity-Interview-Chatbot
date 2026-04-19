# Fixed Interview Protocol

This application is intentionally built around a deterministic research workflow.

## Participant flow

1. Introduction
2. Eligibility confirmation
3. Standard source question
4. Approved guidance only if requested
5. Rephrased ranking confirmation
6. Information collection
7. Completion or ineligible termination

## Approved wording

Introduction:
`No one's name will be used in the research, but email addresses are collected in case we have follow-up questions based on the results. This is a study on identity conducted by graduate students at the University of Pennsylvania as part of a research assignment. Whether the results will be published depends on the findings. Participants will not be personally identified, and there are approximately 3,000 people in the study initially.`

Eligibility:
`Do you identify yourself as a Latino?`

Standard source question:
`Where do you get your identity from? Please list five sources, from most important to least important.`

Approved guidance:
`If you were to describe to a neutral third party who you are, what would you say?`

## Methodological constraints

- The chatbot UI must not invent interview questions.
- The identity question is fixed and defined in `lib/domain/protocol.ts`.
- The clarification is fixed and defined in `lib/domain/protocol.ts`.
- AI may parse and suggest, but it must not drive the research question.
- The participant cannot skip required steps.
- The raw transcript is always preserved.

## Language policy

- English and Spanish phrasing are fixed in code.
- Prompts are not dynamically translated with AI.
- The language used is preserved in the session record.

## Researcher review

- Category suggestions are advisory only.
- Final coding remains a researcher decision.
- Follow-up reasons are surfaced, not automated away.
