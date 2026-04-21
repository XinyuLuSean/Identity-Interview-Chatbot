import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Legacy participant session APIs are disabled." },
    { status: 410 },
  );
}
