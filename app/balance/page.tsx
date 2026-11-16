import { StubPage } from "@/app/components/StubPage";

export default function BalancePage() {
  return (
    <StubPage
      eyebrow="Rewards"
      title="Balance"
      description="Coin balance and transaction ledger for the signed-in viewer."
      endpoints={["GET /api/coins/balance", "GET /api/coins/transactions", "POST /api/coins/daily/claim"]}
    />
  );
}
