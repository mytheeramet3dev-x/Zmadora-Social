"use client";

import EditProfileForm from "@/components/profile/EditProfileForm";
import StartChatButton from "@/components/chat/StartChatButton";
import FollowButton from "@/components/profile/FollowButton";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

import { LinkIcon, MapPinIcon, UsersIcon } from "lucide-react";
import { useState } from "react";

type ProfileHeaderPanelProps = {
  profile: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
    bio: string | null;
    location: string | null;
    website: string | null;
    isOwnProfile: boolean;
    isFollowing: boolean;
    _count: {
      posts: number;
      followers: number;
      following: number;
    };
    friendCount: number;
  };
};

function ProfileHeaderPanel({ profile }: ProfileHeaderPanelProps) {
  const [view, setView] = useState({
    name: profile.name,
    image: profile.image,
    bio: profile.bio,
    location: profile.location,
    website: profile.website,
    isFollowing: profile.isFollowing,
    followers: profile._count.followers,
  });

  return (
    <div className="border-b border-border bg-background">
      <div className="h-32 bg-muted/60 border-b border-border/50" />
      <div className="relative px-5 pb-5 pt-0">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-3 md:flex-row md:items-end">
            <Avatar className="h-24 w-24 -translate-y-8 border-4 border-background shadow-sm">
              <AvatarImage src={view.image || "/avatar.png"} />
            </Avatar>

            <div className="md:pb-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                {view.name || profile.username}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">@{profile.username}</p>
            </div>
          </div>

          {!profile.isOwnProfile ? (
            <div className="flex gap-2 md:pb-1">
              <StartChatButton
                contact={{
                  id: profile.id,
                  name: view.name,
                  username: profile.username,
                  image: view.image,
                }}
              />
              <FollowButton
                targetUserId={profile.id}
                initialIsFollowing={view.isFollowing}
                onFollowChange={(isFollowing) => {
                  setView((current) => ({
                    ...current,
                    isFollowing,
                    followers: Math.max(0, current.followers + (isFollowing ? 1 : -1)),
                  }));
                }}
              />
            </div>
          ) : (
            <div className="md:pb-1">
              <EditProfileForm
                initialName={view.name || ""}
                initialBio={view.bio || ""}
                initialLocation={view.location || ""}
                initialWebsite={view.website || ""}
                initialImage={view.image || ""}
                onSaved={(nextProfile) => {
                  setView((current) => ({
                    ...current,
                    name: nextProfile.name,
                    bio: nextProfile.bio,
                    location: nextProfile.location,
                    website: nextProfile.website,
                    image: nextProfile.image,
                  }));
                }}
              />
            </div>
          )}
        </div>

        {view.bio ? (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground">{view.bio}</p>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">
            This profile has not added a bio yet.
          </p>
        )}

        <div className="mt-4 grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Posts</p>
            <p className="mt-1 text-xl font-semibold">{profile._count.posts}</p>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Followers</p>
            <p className="mt-1 text-xl font-semibold">{view.followers}</p>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Following</p>
            <p className="mt-1 text-xl font-semibold">{profile._count.following}</p>
          </div>
          <div className="rounded-md border border-border bg-card p-3">
            <p className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground">
              <UsersIcon className="h-3.5 w-3.5" />
              Friends
            </p>
            <p className="mt-1 text-xl font-semibold">{profile.friendCount}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:gap-4">
          <div className="inline-flex items-center gap-1.5">
            <MapPinIcon className="h-3.5 w-3.5" />
            <span>{view.location || "No location set"}</span>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <LinkIcon className="h-3.5 w-3.5" />
            {view.website ? (
              <a
                href={view.website}
                target="_blank"
                rel="noreferrer"
                className="truncate hover:underline text-primary"
              >
                {view.website}
              </a>
            ) : (
              <span>No website set</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileHeaderPanel;
