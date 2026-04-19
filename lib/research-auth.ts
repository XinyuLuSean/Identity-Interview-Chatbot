import { cookies } from "next/headers";

export const RESEARCHER_ACCESS_COOKIE = "identity_research_access";

export function getResearcherAccessCode() {
  return process.env.RESEARCHER_ACCESS_CODE || "research-only-demo";
}

export async function isResearcherAuthorized() {
  const cookieStore = await cookies();
  return (
    cookieStore.get(RESEARCHER_ACCESS_COOKIE)?.value === getResearcherAccessCode()
  );
}
