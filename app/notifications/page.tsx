import { StubPage } from "@/app/components/StubPage";

export default function NotificationsPage() {
  return (
    <StubPage
      eyebrow="Account"
      title="Notifications"
      description="Notification inbox with read/dismiss/read-all operations and cursor pagination."
      endpoints={[
        "GET /api/notifications?cursor=&limit=",
        "POST /api/notifications/{id}/read",
        "DELETE /api/notifications/{id}",
        "POST /api/notifications/read-all",
        "DELETE /api/notifications/read"
      ]}
    />
  );
}
