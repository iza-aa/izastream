import { notFound } from "next/navigation";
import { StubPage } from "@/app/components/StubPage";

export default async function UserPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  if (!username) notFound();
  return (
    <StubPage
      eyebrow="Public profile"
      title={`@${username}`}
      description="Public profile with library tabs. Tabs observed in the client: library (watchlist), favourites, saved collections, activity, comments, reviews and shorts."
      endpoints={[
        "GET /api/users/{username}",
        "GET /api/users/{username}/watchlist",
        "GET /api/users/{username}/favourites",
        "GET /api/users/{username}/activity",
        "GET /api/user-collections/public/{username}"
      ]}
      links={[
        { href: `/user/${username}?tab=library&view=watchlist`, label: "Watchlist" },
        { href: `/user/${username}?tab=library&view=favourites`, label: "Favourites" }
      ]}
    />
  );
}
