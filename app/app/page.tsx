import { StubPage } from "@/app/components/StubPage";

export default function AppLandingPage() {
  return (
    <StubPage
      eyebrow="Client"
      title="IDLIX app"
      description="Mobile-app landing route discovered as href /app. The web client also exposes TV pairing endpoints for living-room devices."
      endpoints={["POST /api/auth/tv/pairings/approve", "POST /api/auth/tv/pairings/deny", "GET /api/auth/tv/pairings/{code}"]}
    />
  );
}
