import { StubPage } from "@/app/components/StubPage";

export default function WatchProgressPage() {
  return (
    <StubPage
      eyebrow="Library"
      title="Continue watching"
      description="Per-profile playback progress used by the homepage rail and the player resume flow."
      endpoints={["GET /api/watch-progress", "PUT /api/watch-progress/{type}/{id}", "DELETE /api/auth/me/watch-history"]}
    />
  );
}
