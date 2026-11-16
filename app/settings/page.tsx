import { StubPage } from "@/app/components/StubPage";

export default function SettingsPage() {
  return (
    <StubPage
      eyebrow="Account"
      title="Settings"
      description="Profile, player preferences, email change, password change, notification preferences and session management. The route exists in the captured navigation; all mutations are session-authenticated."
      endpoints={[
        "GET /api/auth/me",
        "PATCH /api/auth/me",
        "PATCH /api/auth/me/player-preferences",
        "PATCH /api/auth/change-email/request",
        "POST /api/auth/change-password",
        "PUT /api/me/notification-preferences",
        "GET /api/auth/sessions"
      ]}
      links={[{ href: "/notifications", label: "Notifications" }, { href: "/watchlist", label: "Watchlist" }]}
    />
  );
}
