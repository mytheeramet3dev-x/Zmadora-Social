import Link from "next/link";
import FollowButton from "@/components/profile/FollowButton";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";

type Friend = {
  id: string;
  name: string | null;
  username: string;
  image: string | null;
  isFollowing: boolean;
};

type FriendsListProps = {
  friends: Friend[];
  viewerUserId: string | null;
};

function FriendsList({ friends, viewerUserId }: FriendsListProps) {
  if (friends.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <p className="text-lg font-medium">No mutual friends yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Friends appear here when two users follow each other.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {friends.map((friend) => (
        <Card key={friend.id} className="overflow-hidden">
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <Link href={`/profile/${friend.username}`} className="flex min-w-0 items-center gap-3">
              <Avatar className="h-12 w-12 border border-white/30">
                <AvatarImage src={friend.image || "/avatar.png"} />
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {friend.name || friend.username}
                </p>
                <p className="truncate text-xs text-muted-foreground">@{friend.username}</p>
              </div>
            </Link>

            {viewerUserId && friend.id !== viewerUserId ? (
              <FollowButton
                targetUserId={friend.id}
                initialIsFollowing={friend.isFollowing}
                followLabel="Follow"
                followingLabel="Unfollow"
                pendingLabel="Updating..."
                size="sm"
                className="min-w-24"
              />
            ) : (
              <div className="rounded-full border border-white/20 bg-white/20 px-3 py-1 text-xs font-medium text-muted-foreground dark:bg-white/5">
                Friend
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default FriendsList;
