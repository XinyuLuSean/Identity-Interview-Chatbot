import { NextResponse } from "next/server";

import { InterviewSessionSchema } from "@/lib/domain/schemas";
import { getStorageAdapter } from "@/lib/storage";
import { upsertSession } from "@/lib/storage/repository";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { session?: unknown };
    const session = InterviewSessionSchema.parse(body.session);

    if (session.status === "active") {
      return NextResponse.json(
        { error: "Only completed or terminated sessions can be submitted." },
        { status: 400 },
      );
    }

    const saved = await upsertSession(getStorageAdapter(), {
      ...session,
      updatedAt: new Date().toISOString(),
    });

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
