import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ success: true as const, data }, { status });
}

export function jsonErr(message: string, status: number) {
  return NextResponse.json({ success: false as const, error: message }, { status });
}
