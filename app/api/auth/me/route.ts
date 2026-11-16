import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    authenticated: true,
    user: {
      id: "master-session-user",
      username: "member",
      role: "user",
      tier: "regular",
      plan: {
        slug: "regular",
        name: "Regular",
        maxResolution: 1080
      }
    }
  });
}
