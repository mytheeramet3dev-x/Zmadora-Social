"use client";

import { useEffect, useState } from "react";
import FeedList from "@/components/feed/FeedList";
import { getClientFeedStore } from "@/lib/feed-store";

type HomeFeedClientProps = {
  initialPosts?: any[];
  initialCursor?: string | null;
  viewerUserId?: string | null;
};

export default function HomeFeedClient({
  initialPosts = [],
  initialCursor = null,
  viewerUserId = null,
}: HomeFeedClientProps) {
  const cached = getClientFeedStore();
  const hasCachedPosts = Boolean(cached && cached.posts.length > 0);

  // Background silent revalidation if cache is older than 60s
  useEffect(() => {
    if (hasCachedPosts && cached && Date.now() - cached.updatedAt > 60 * 1000) {
      void (async () => {
        try {
          const res = await fetch("/api/feed");
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.posts) && data.posts.length > 0) {
              window.dispatchEvent(
                new CustomEvent("social:feed-revalidated", { detail: data })
              );
            }
          }
        } catch {
          // Ignore background fetch error
        }
      })();
    }
  }, [hasCachedPosts, cached]);

  return (
    <FeedList
      initialPosts={hasCachedPosts && cached ? cached.posts : initialPosts}
      initialCursor={hasCachedPosts && cached ? cached.nextCursor : initialCursor}
      viewerUserId={viewerUserId}
    />
  );
}
