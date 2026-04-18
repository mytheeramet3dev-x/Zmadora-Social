"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import toast from "react-hot-toast";
import { toggleFollow } from "@/actions/user.action";
import { useLayoutChrome } from "@/components/layout/LayoutChromeContext";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CopyIcon,
  MessageCircleMoreIcon,
  UserCheckIcon,
  UserIcon,
  UserPlusIcon,
} from "lucide-react";

type UserQuickActionsProps = {
  user: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
    bio?: string | null;
    location?: string | null;
    website?: string | null;
    stats?: {
      followers: number;
      posts: number;
    };
    isFollowing?: boolean;
  };
  viewerUserId?: string | null;
  children: React.ReactNode;
};

function UserQuickActions({ user, viewerUserId, children }: UserQuickActionsProps) {
  const { openChat } = useLayoutChrome();
  const [open, setOpen] = useState(false);
  const [isFollowing, setIsFollowing] = useState(user.isFollowing ?? false);
  const [isPending, startTransition] = useTransition();

  const isOwnProfile = viewerUserId === user.id;
  const profileHref = `/profile/${user.username}`;

  const handleToggleFollow = () => {
    if (!viewerUserId) {
      toast.error("Sign in to follow people");
      return;
    }

    const nextState = !isFollowing;
    setIsFollowing(nextState);

    startTransition(async () => {
      const result = await toggleFollow(user.id);

      if (!result?.success) {
        setIsFollowing(!nextState);
        toast.error(result?.error || "Could not update follow status");
        return;
      }

      setIsFollowing(result.isFollowing ?? nextState);
      toast.success(
        (result.isFollowing ?? nextState)
          ? `Following @${user.username}`
          : `Unfollowed @${user.username}`
      );
    });
  };

  const handleChat = () => {
    if (!viewerUserId) {
      toast.error("Sign in to start a chat");
      return;
    }

    openChat();
    window.dispatchEvent(
      new CustomEvent("social:open-chat", {
        detail: {
          id: user.id,
          name: user.name,
          username: user.username,
          image: user.image,
        },
      })
    );

    setOpen(false);
  };

  const handleCopyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${profileHref}`);
      toast.success("Profile link copied");
      setOpen(false);
    } catch {
      toast.error("Could not copy profile link");
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[308px] rounded-[28px] border border-border bg-card p-0 text-card-foreground shadow-xl"
      >
        <div className="p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Quick Actions
          </p>

          <div className="mt-3 flex items-start gap-3">
            <Avatar className="h-12 w-12 border border-border">
              <AvatarImage src={user.image || "/avatar.png"} />
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {user.name || user.username}
              </p>
              <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
              {user.bio ? (
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-foreground/80">
                  {user.bio}
                </p>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  Open the full profile for more details.
                </p>
              )}
            </div>
          </div>

          {user.stats ? (
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-muted/50 p-2">
              <div className="rounded-2xl bg-muted px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Posts</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{user.stats.posts}</p>
              </div>
              <div className="rounded-2xl bg-muted px-3 py-2">
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  Followers
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{user.stats.followers}</p>
              </div>
            </div>
          ) : null}
        </div>

        <DropdownMenuSeparator className="bg-border" />

        <div className="grid grid-cols-2 gap-2 p-4">
          <Button asChild variant="outline" className="h-10">
            <Link href={profileHref} onClick={() => setOpen(false)}>
              <UserIcon className="h-4 w-4" />
              View Profile
            </Link>
          </Button>

          {isOwnProfile ? (
            <Button asChild className="h-10">
              <Link href={profileHref} onClick={() => setOpen(false)}>
                Edit Profile
              </Link>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleToggleFollow}
              disabled={isPending}
              className="h-10"
            >
              {isFollowing ? <UserCheckIcon className="h-4 w-4" /> : <UserPlusIcon className="h-4 w-4" />}
              {isPending ? "Updating..." : isFollowing ? "Following" : "Follow"}
            </Button>
          )}

          {!isOwnProfile ? (
            <Button
              type="button"
              variant="outline"
              onClick={handleChat}
              className="h-10"
            >
              <MessageCircleMoreIcon className="h-4 w-4" />
              Chat
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            className="h-10 text-foreground/80 hover:bg-muted/50 hover:text-foreground"
          >
            <CopyIcon className="h-4 w-4" />
            Copy Link
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserQuickActions;
