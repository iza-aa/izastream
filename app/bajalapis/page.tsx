import { StubPage } from "@/app/components/StubPage";

export default function AdminPage() {
  return (
    <StubPage
      eyebrow="Disguised admin surface"
      title="Admin (bajalapis)"
      description="The public client defaults NEXT_PUBLIC_ADMIN_PATH to '/bajalapis'. The admin client exposes analytics, cache control, collections, comments moderation, domain/certificate management, users, plans, settings, secrets, release announcements and database maintenance."
      endpoints={[
        "GET /api/admin/analytics/overview",
        "GET /api/admin/health",
        "POST /api/admin/cache/flush",
        "GET /api/admin/database/overview",
        "GET /api/admin/settings",
        "GET /api/admin/users/staff",
        "POST /api/admin/broadcasts"
      ]}
    />
  );
}
