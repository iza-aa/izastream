import { NextResponse } from "next/server";
import { searchContent } from "@/lib/data";

export function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  return NextResponse.json({ data: searchContent(q).map((entry) => ({ contentType: entry.contentType, ...entry.content })) });
}
