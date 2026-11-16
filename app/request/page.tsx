import { StubPage } from "@/app/components/StubPage";

export default function RequestPage() {
  return (
    <StubPage
      eyebrow="Community"
      title="Request a title"
      description="Viewer-submitted content requests with voting, search and admin review."
      endpoints={["GET /api/requests", "POST /api/requests", "POST /api/requests/{id}/vote", "GET /api/requests/search?q="]}
    />
  );
}
