import { getProfileByUsername } from "@/actions/user.action";
import ProfileFeedList from "@/components/feed/ProfileFeedList";
import ProfileHeaderPanel from "@/components/profile/ProfileHeaderPanel";
import FriendsList from "@/components/profile/FriendsList";
import { notFound } from "next/navigation";

type ProfilePageProps = {
  params: Promise<{
    username: string;
  }>;
};

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  return (
    <div className="w-full space-y-6">
      <ProfileHeaderPanel profile={profile} />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Friends</h2>
            <p className="text-sm text-muted-foreground">
              Mutual follows for @{profile.username}
            </p>
          </div>
        </div>

        <FriendsList friends={profile.friends} viewerUserId={profile.viewerUserId} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Posts</h2>
            <p className="text-sm text-muted-foreground">
              Recent updates from @{profile.username}
            </p>
          </div>
        </div>

        <ProfileFeedList
          profileUserId={profile.id}
          profileMeta={{
            bio: profile.bio,
            location: profile.location,
            website: profile.website,
            followers: profile._count.followers,
            posts: profile._count.posts,
            isFollowing: profile.isFollowing,
          }}
          initialPosts={profile.posts.map((post) => ({
            ...post,
            author: {
              ...post.author,
              bio: profile.bio,
              location: profile.location,
              website: profile.website,
              stats: {
                followers: profile._count.followers,
                posts: profile._count.posts,
              },
              isFollowing: profile.isFollowing,
            },
          }))}
          viewerUserId={profile.viewerUserId}
        />
      </div>
    </div>
  );
}
