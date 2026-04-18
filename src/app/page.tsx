import { getPostsPage } from "@/actions/post.action";
import { getDbUserId, getCurrentUserContext } from "@/actions/user.action";
import CreatePost from "@/components/feed/CreatePost";
import FeedList from "@/components/feed/FeedList";
import GuestFeedCTA from "@/components/feed/GuestFeedCTA";
import FeedSkeleton from "@/components/feed/FeedSkeleton";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { Suspense } from "react";

async function HomeFeed() {
  const [{ posts, nextCursor }, viewerUserId] = await Promise.all([
    getPostsPage(),
    getDbUserId(),
  ]);

  return (
    <FeedList
      initialPosts={posts}
      initialCursor={nextCursor}
      viewerUserId={viewerUserId}
    />
  );
}

export default async function Home() {
  const context = await getCurrentUserContext();

  return (
    <div className="w-full min-h-screen border-x border-border divide-y divide-border">
      <SignedIn>
        <CreatePost userImage={context?.dbUser.image} />
      </SignedIn>

      <Suspense fallback={<FeedSkeleton />}>
        <HomeFeed />
      </Suspense>

      <SignedOut>
        <GuestFeedCTA />
      </SignedOut>
    </div>
  );
}
