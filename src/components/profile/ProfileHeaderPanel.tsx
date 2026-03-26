"use client";

import EditProfileForm from "@/components/profile/EditProfileForm";
import StartChatButton from "@/components/chat/StartChatButton";
import FollowButton from "@/components/profile/FollowButton";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
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
    <Card className="overflow-hidden">
      <div className="h-40 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.85),rgba(255,255,255,0.2)_36%,rgba(45,212,191,0.35)_76%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.35),rgba(15,23,42,0.2)_36%,rgba(45,212,191,0.18)_76%)]" />
      <CardContent className="relative px-6 pb-6 pt-0">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <Avatar className="h-28 w-28 -translate-y-10 border-[6px] border-white/70 shadow-2xl dark:border-slate-950/70">
              <AvatarImage src={view.image || "/avatar.png"} />
            </Avatar>

            <div className="md:pb-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {view.name || profile.username}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
            </div>
          </div>

          {!profile.isOwnProfile ? (
            <div className="flex gap-2 md:pb-3">
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
            <div className="md:pb-3">
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
          <p className="mt-2 max-w-2xl text-sm leading-6 text-foreground/90">{view.bio}</p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">
            This profile has not added a bio yet.
          </p>
        )}

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-white/20 bg-white/35 px-4 py-3 dark:bg-white/5">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Posts</p>
            <p className="mt-2 text-2xl font-semibold">{profile._count.posts}</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/35 px-4 py-3 dark:bg-white/5">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Followers</p>
            <p className="mt-2 text-2xl font-semibold">{view.followers}</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/35 px-4 py-3 dark:bg-white/5">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Following</p>
            <p className="mt-2 text-2xl font-semibold">{profile._count.following}</p>
          </div>
          <div className="rounded-2xl border border-white/20 bg-white/35 px-4 py-3 dark:bg-white/5">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <UsersIcon className="h-3.5 w-3.5" />
              Friends
            </p>
            <p className="mt-2 text-2xl font-semibold">{profile.friendCount}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:gap-5">
          <div className="inline-flex items-center gap-2">
            <MapPinIcon className="h-4 w-4" />
            <span>{view.location || "No location set"}</span>
          </div>
          <div className="inline-flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            {view.website ? (
              <a
                href={view.website}
                target="_blank"
                rel="noreferrer"
                className="truncate hover:underline"
              >
                {view.website}
              </a>
            ) : (
              <span>No website set</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ProfileHeaderPanel;
