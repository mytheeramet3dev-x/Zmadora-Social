import { getPostsPage } from "@/actions/post.action";
import { getCurrentUserContext } from "@/actions/user.action";
import CreatePost from "@/components/feed/CreatePost";
import HomeFeedClient from "@/components/feed/HomeFeedClient";
import GuestFeedCTA from "@/components/feed/GuestFeedCTA";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [context, { posts, nextCursor }] = await Promise.all([
    getCurrentUserContext(),
    getPostsPage(),
  ]);

  return (
    <div className="w-full min-h-screen border-x border-border divide-y divide-border">
      <SignedIn>
        <CreatePost userImage={context?.dbUser.image} />
      </SignedIn>

      <HomeFeedClient
        initialPosts={posts}
        initialCursor={nextCursor}
        viewerUserId={context?.dbUser?.id}
      />

      <SignedOut>
        <GuestFeedCTA />
      </SignedOut>
    </div>
  );
}
