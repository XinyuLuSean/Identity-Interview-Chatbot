import { after, NextResponse } from "next/server";

import { InterviewSubmissionSchema } from "@/lib/domain/schemas";
import { buildSubmittedInterviewSession } from "@/lib/interview-session";
import { runDeferredInterviewAnalysis } from "@/lib/interview-analysis";
import { validateMetadata, validateRankedSources } from "@/lib/domain/state-machine";
import { clearParticipantSessionCookie, getParticipantSessionToken } from "@/lib/participant-auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";
import { getStorageAdapter } from "@/lib/storage";
import { getSessionById, upsertSession } from "@/lib/storage/repository";

export async function POST(request: Request) {
  try {
    const participantSession = await getParticipantSessionToken();
    if (!participantSession) {
      return NextResponse.json(
        { error: "Your interview session has expired. Please start again." },
        { status: 401 },
      );
    }

    const rateLimit = consumeRateLimit({
      bucket: "interview-submit",
      key: `${getClientIp(request)}:${participantSession.sessionId}`,
      limit: 6,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many submit attempts. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const body = (await request.json()) as { submission?: unknown };
    const submission = InterviewSubmissionSchema.parse(body.submission);

    if (
      submission.sessionId !== participantSession.sessionId ||
      submission.subjectId !== participantSession.subjectId ||
      submission.languageCode !== participantSession.languageCode
    ) {
      return NextResponse.json({ error: "Interview session mismatch." }, { status: 403 });
    }

    if (
      submission.eligibilityResult === "eligible" &&
      (!submission.identityResponse?.trim() ||
        !validateRankedSources(submission.rankedSourcesDraft))
    ) {
      return NextResponse.json(
        { error: "A complete eligible interview requires the identity response and five ranked sources." },
        { status: 400 },
      );
    }

    const metadata =
      submission.eligibilityResult === "eligible" && submission.metadata
        ? validateMetadata(submission.metadata)
        : null;

    if (submission.eligibilityResult === "eligible" && (!metadata || !metadata.success)) {
      return NextResponse.json(
        {
          error:
            metadata && !metadata.success
              ? metadata.error.issues[0]?.message ?? "Invalid metadata."
              : "Metadata is required for eligible interviews.",
        },
        { status: 400 },
      );
    }

    const adapter = getStorageAdapter();
    const existingSession = await getSessionById(adapter, participantSession.sessionId);
    if (existingSession) {
      return NextResponse.json(
        { error: "This interview session was already submitted." },
        { status: 409 },
      );
    }

    const session = buildSubmittedInterviewSession({
      sessionId: participantSession.sessionId,
      subjectId: participantSession.subjectId,
      languageCode: participantSession.languageCode,
      createdAt: participantSession.createdAt,
      eligibilityResult: submission.eligibilityResult,
      clarificationUsed: submission.clarificationUsed,
      identityResponse: submission.identityResponse?.trim() ?? null,
      rankedSourcesRawInput:
        submission.rankedSourcesRawInput?.trim() || submission.identityResponse?.trim() || null,
      rankedSourcesDraft: submission.rankedSourcesDraft,
      parserConfidence: submission.parserConfidence,
      parserWarnings: submission.parserWarnings,
      metadata: metadata?.success ? metadata.data : null,
    });
    const saved = await upsertSession(adapter, session);
    await clearParticipantSessionCookie();

    if (saved.status === "completed" && saved.eligibilityResult === "eligible") {
      after(async () => {
        await runDeferredInterviewAnalysis(saved.sessionId);
      });
    }

    return NextResponse.json({ session: saved });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to submit interview.",
      },
      { status: 400 },
    );
  }
}
