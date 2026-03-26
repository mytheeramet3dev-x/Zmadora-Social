"use client";

import { toggleFollow } from "@/actions/user.action";
import { Button } from "@/components/ui/button";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";

type FollowButtonProps = {
  targetUserId: string;
  initialIsFollowing: boolean;
  followLabel?: string;
  followingLabel?: string;
  pendingLabel?: string;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  onFollowChange?: (isFollowing: boolean) => void;
};

function FollowButton({
  targetUserId,
  initialIsFollowing,
  followLabel = "Follow",
  followingLabel = "Following",
  pendingLabel = "Updating...",
  className,
  size = "default",
  onFollowChange,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isPending, startTransition] = useTransition();

  const handleToggleFollow = () => {
    const nextState = !isFollowing;
    setIsFollowing(nextState);
    onFollowChange?.(nextState);

    startTransition(async () => {
      const result = await toggleFollow(targetUserId);

      if (!result?.success) {
        setIsFollowing(!nextState);
        onFollowChange?.(!nextState);
        toast.error(result?.error || "Could not update follow status");
        return;
      }

      setIsFollowing(result.isFollowing ?? nextState);
      onFollowChange?.(result.isFollowing ?? nextState);
      toast.success((result.isFollowing ?? nextState) ? "Now following" : "Follow removed");
    });
  };

  return (
    <Button
      onClick={handleToggleFollow}
      disabled={isPending}
      variant={isFollowing ? "outline" : "default"}
      size={size}
      className={className ?? "min-w-28"}
    >
      {isPending ? pendingLabel : isFollowing ? followingLabel : followLabel}
    </Button>
  );
}

export default FollowButton;
