import { StubPage } from "@/app/components/StubPage";

export default function PlansPage() {
  return (
    <StubPage
      eyebrow="Monetization"
      title="Premium plans"
      description="Plan catalog and authenticated subscription purchase. The public /api/plans response was captured and includes availability and payment-gateway metadata."
      endpoints={["GET /api/plans", "GET /api/plans?all=1", "GET /api/plans/me/subscription", "POST /api/plans/purchase"]}
    />
  );
}
