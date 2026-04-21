import { cookies } from "next/headers";

import { issueSignedToken, verifySignedToken } from "@/lib/security";

export const RESEARCHER_ACCESS_COOKIE = "identity_research_access";
const RESEARCHER_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 8;

type ResearcherAccessToken = {
  scope: "researcher";
  iat: number;
};

export function getResearcherAccessCode() {
  const accessCode = process.env.RESEARCHER_ACCESS_CODE?.trim();
  if (!accessCode) {
    throw new Error("RESEARCHER_ACCESS_CODE is not configured.");
  }

  return accessCode;
}

export async function setResearcherAuthorized() {
  const cookieStore = await cookies();
  cookieStore.set(
    RESEARCHER_ACCESS_COOKIE,
    issueSignedToken({ scope: "researcher" }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: RESEARCHER_ACCESS_MAX_AGE_SECONDS,
    },
  );
}

export async function isResearcherAuthorized() {
  const cookieStore = await cookies();
  const payload = verifySignedToken<ResearcherAccessToken>(
    cookieStore.get(RESEARCHER_ACCESS_COOKIE)?.value,
    RESEARCHER_ACCESS_MAX_AGE_SECONDS * 1000,
  );

  return payload?.scope === "researcher";
}
