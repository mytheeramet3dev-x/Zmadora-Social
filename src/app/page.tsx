import { getPosts } from "@/actions/post.action";
import { getDbUserId } from "@/actions/user.action";
import CreatePost from "@/components/feed/CreatePost";
import FeedList from "@/components/feed/FeedList";
import GuestFeedCTA from "@/components/feed/GuestFeedCTA";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default async function Home() {
  const [posts, viewerUserId] = await Promise.all([getPosts(), getDbUserId()]);

  return (
    <div className="w-full space-y-6">
      <SignedIn>
        <CreatePost />
      </SignedIn>

      <FeedList initialPosts={posts} viewerUserId={viewerUserId} />

      <SignedOut>
        <GuestFeedCTA />
      </SignedOut>
    </div>
  );
}
