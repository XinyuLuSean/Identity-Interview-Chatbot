import { NextResponse } from "next/server";

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    { error: "Analysis is now handled securely during interview submission." },
    { status: 410 },
  );
}
