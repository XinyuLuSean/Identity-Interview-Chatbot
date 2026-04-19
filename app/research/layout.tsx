import type { ReactNode } from "react";

import { ResearchGate } from "@/components/research/research-gate";
import { isResearcherAuthorized } from "@/lib/research-auth";

export default async function ResearchLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const isAuthed = await isResearcherAuthorized();

  if (!isAuthed) {
    return <ResearchGate />;
  }

  return <>{children}</>;
}
