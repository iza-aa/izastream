import { NextResponse } from "next/server";
import { uniqueGenres } from "@/lib/data";

export function GET() {
  return NextResponse.json({ data: uniqueGenres().map((name) => ({ name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") })) });
}
