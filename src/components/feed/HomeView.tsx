"use client";

import { useEffect, useState } from "react";
import CreatePost from "@/components/feed/CreatePost";
import FeedList from "@/components/feed/FeedList";
import GuestFeedCTA from "@/components/feed/GuestFeedCTA";
import { SignedIn, SignedOut, useUser } from "@clerk/nextjs";
import { getClientFeedStore, saveClientFeedStore } from "@/lib/feed-store";
import { Loader2Icon } from "lucide-react";

export default function HomeView() {
  const { user } = useUser();
  const [storeState, setStoreState] = useState(() => getClientFeedStore());
  const [isLoadingInitial, setIsLoadingInitial] = useState(
    () => !storeState || storeState.posts.length === 0
  );

  useEffect(() => {
    const cached = getClientFeedStore();
    if (!cached || cached.posts.length === 0) {
      // First direct visit: fetch initial feed
      setIsLoadingInitial(true);
      fetch("/api/feed")
        .then((res) => res.json())
        .then((data) => {
          if (data && Array.isArray(data.posts)) {
            saveClientFeedStore(data.posts, data.nextCursor || null, Boolean(data.nextCursor), 0);
            setStoreState(getClientFeedStore());
          }
        })
        .catch(console.error)
        .finally(() => {
          setIsLoadingInitial(false);
        });
    } else {
      // Background silent revalidation if cache is > 30s old
      if (Date.now() - cached.updatedAt > 30 * 1000) {
        fetch("/api/feed")
          .then((res) => res.json())
          .then((data) => {
            if (data && Array.isArray(data.posts) && data.posts.length > 0) {
              window.dispatchEvent(
                new CustomEvent("social:feed-revalidated", { detail: data })
              );
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  return (
    <div className="w-full min-h-screen border-x border-border divide-y divide-border">
      <SignedIn>
        <CreatePost userImage={user?.imageUrl} />
      </SignedIn>

      {isLoadingInitial && (!storeState || storeState.posts.length === 0) ? (
        <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2">
          <Loader2Icon className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm">Loading feed...</span>
        </div>
      ) : (
        <FeedList
          initialPosts={storeState?.posts || []}
          initialCursor={storeState?.nextCursor || null}
          viewerUserId={user?.id}
        />
      )}

      <SignedOut>
        <GuestFeedCTA />
      </SignedOut>
    </div>
  );
}
