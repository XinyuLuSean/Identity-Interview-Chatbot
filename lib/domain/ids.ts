import { slugify } from "@/lib/utils";

export function createSessionId() {
  return `session_${crypto.randomUUID()}`;
}

export function createSubjectId() {
  const year = new Date().getFullYear();
  return `EAS5120-${year}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export function createMessageId(sessionId: string, index: number) {
  return `${slugify(sessionId)}-${index}`;
}

