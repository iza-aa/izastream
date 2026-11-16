import { StubPage } from "@/app/components/StubPage";

export default function LeaderboardPage() {
  return (
    <StubPage
      eyebrow="Community"
      title="Leaderboard"
      description="Public coin-holder leaderboard with configurable limit."
      endpoints={["GET /api/coins/leaderboard/holders?limit="]}
    />
  );
}
