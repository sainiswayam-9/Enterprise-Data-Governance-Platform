import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({ detail: "Use a specific data path." }, { status: 400 });
}
