import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  await context.params;
  return NextResponse.json(
    { error: "Legacy participant session APIs are disabled." },
    { status: 410 },
  );
}

export async function PATCH(_: Request, context: RouteContext) {
  await context.params;
  return NextResponse.json(
    { error: "Legacy participant session APIs are disabled." },
    { status: 410 },
  );
}
