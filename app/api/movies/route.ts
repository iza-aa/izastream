import { NextResponse } from "next/server";
import { findByKind } from "@/lib/data";

export function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? 20)));
  const all = kind === "movie" || kind === "series" ? findByKind(kind === "movie" ? "movie" : "tv_series") : [];
  const start = (page - 1) * limit;
  const data = all.slice(start, start + limit).map((entry) => ({
    contentType: entry.contentType,
    ...entry.content
  }));
  return NextResponse.json({ data, pagination: { page, limit, total: all.length, totalPages: Math.ceil(all.length / limit) } });
}
