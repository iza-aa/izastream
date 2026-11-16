import { StubPage } from "@/app/components/StubPage";

export default function CoinsPage() {
  return (
    <StubPage
      eyebrow="Rewards"
      title="Coins"
      description="Daily claim, balance, transaction history and public leaderboards."
      endpoints={[
        "GET /api/coins/balance",
        "GET /api/coins/daily",
        "POST /api/coins/daily/claim",
        "GET /api/coins/transactions",
        "GET /api/coins/leaderboard/holders"
      ]}
    />
  );
}
