import { cookies } from "next/headers";

import type { InterviewSession, LanguageCode } from "@/lib/domain/schemas";
import { issueSignedToken, verifySignedToken } from "@/lib/security";

export const PARTICIPANT_SESSION_COOKIE = "identity_participant_session";
const PARTICIPANT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 12;

type ParticipantSessionToken = {
  sessionId: string;
  subjectId: string;
  languageCode: LanguageCode;
  createdAt: string;
  iat: number;
};

export async function setParticipantSessionCookie(session: Pick<
  InterviewSession,
  "sessionId" | "subjectId" | "languageCode" | "createdAt"
>) {
  const cookieStore = await cookies();
  cookieStore.set(
    PARTICIPANT_SESSION_COOKIE,
    issueSignedToken({
      sessionId: session.sessionId,
      subjectId: session.subjectId,
      languageCode: session.languageCode,
      createdAt: session.createdAt,
    }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: PARTICIPANT_SESSION_MAX_AGE_SECONDS,
    },
  );
}

export async function clearParticipantSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(PARTICIPANT_SESSION_COOKIE);
}

export async function getParticipantSessionToken() {
  const cookieStore = await cookies();
  return verifySignedToken<ParticipantSessionToken>(
    cookieStore.get(PARTICIPANT_SESSION_COOKIE)?.value,
    PARTICIPANT_SESSION_MAX_AGE_SECONDS * 1000,
  );
}
