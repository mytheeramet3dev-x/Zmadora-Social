"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import PostCard from "@/components/feed/PostCard";
import { Loader2Icon } from "lucide-react";
import { pusherClient } from "@/lib/pusher-client";
import {
  getClientFeedStore,
  saveClientFeedStore,
  updateClientFeedScroll,
  updateClientFeedPost,
  prependClientFeedPost,
  removeClientFeedPost,
  clearClientFeedStore,
  type FeedPost,
} from "@/lib/feed-store";

type FeedListProps = {
  initialPosts: {
    id: string;
    content: string | null;
    image: string | null;
    createdAt: string | Date;
    authorId: string;
    author: {
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
    likes: {
      userId: string;
    }[];
    comments: {
      id: string;
      content: string;
      createdAt: string | Date;
      author: {
        id: string;
        name: string | null;
        username: string;
        image: string | null;
      };
      likes: {
        userId: string;
      }[];
      replies?: {
        id: string;
        content: string;
        createdAt: string | Date;
        author: {
          id: string;
          name: string | null;
          username: string;
          image: string | null;
        };
        likes: {
          userId: string;
        }[];
      }[];
    }[];
    _count: {
      likes: number;
      comments: number;
      bookmarks?: number;
      reposts?: number;
    };
  }[];
  initialCursor?: string | null;
  viewerUserId?: string | null;
};

type NormalizedPost = ReturnType<typeof normalizeFeedPost>;

function normalizeFeedPost(post: any): FeedPost {
  return {
    ...post,
    createdAt: new Date(post.createdAt),
    bookmarks: post.bookmarks || [],
    reposts: post.reposts || [],
    comments: (post.comments || []).map((comment: any) => ({
      ...comment,
      createdAt: new Date(comment.createdAt),
      replies: comment.replies?.map((reply: any) => ({
        ...reply,
        createdAt: new Date(reply.createdAt),
      })),
    })),
    _count: {
      likes: post._count?.likes ?? (post.likes || []).length,
      comments: post._count?.comments ?? (post.comments || []).length,
      bookmarks: post._count?.bookmarks ?? (post.bookmarks || []).length,
      reposts: post._count?.reposts ?? (post.reposts || []).length,
    },
  };
}

function FeedList({
  initialPosts,
  initialCursor = null,
  viewerUserId,
}: FeedListProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  
  // Hydrate from in-memory Client Feed Store if available, else use initial server posts
  const [posts, setPosts] = useState<NormalizedPost[]>(() => {
    const cached = getClientFeedStore();
    if (cached && cached.posts.length > 0) {
      return cached.posts;
    }
    const normalized = initialPosts.map((post) => normalizeFeedPost(post));
    saveClientFeedStore(normalized, initialCursor, Boolean(initialCursor), 0);
    return normalized;
  });

  const [nextCursor, setNextCursor] = useState<string | null>(() => {
    const cached = getClientFeedStore();
    return cached ? cached.nextCursor : initialCursor;
  });

  const [hasMore, setHasMore] = useState<boolean>(() => {
    const cached = getClientFeedStore();
    return cached ? cached.hasMore : Boolean(initialCursor);
  });

  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Restore scroll position seamlessly on mount
  useLayoutEffect(() => {
    const cached = getClientFeedStore();
    if (cached && cached.scrollPosition > 0) {
      // Delay by 1 frame to ensure DOM layout has completed
      requestAnimationFrame(() => {
        window.scrollTo({
          top: cached.scrollPosition,
          behavior: "instant",
        });
      });
    }
  }, []);

  // Track and save scroll position continuously & on unmount
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updateClientFeedScroll(window.scrollY);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      updateClientFeedScroll(window.scrollY);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Listen for explicit feed refresh events (e.g. clicking Home while at top)
  useEffect(() => {
    const handleRefresh = () => {
      clearClientFeedStore();
      const normalized = initialPosts.map((post) => normalizeFeedPost(post));
      setPosts(normalized);
      setNextCursor(initialCursor);
      setHasMore(Boolean(initialCursor));
      saveClientFeedStore(normalized, initialCursor, Boolean(initialCursor), 0);
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("social:refresh-feed", handleRefresh);
    return () => {
      window.removeEventListener("social:refresh-feed", handleRefresh);
    };
  }, [initialCursor, initialPosts]);

  // Realtime subscription synced with both React State and in-memory FeedStore
  useEffect(() => {
    const channel = pusherClient.subscribe("feed-channel");

    const handleFeedEvent = (payload: any) => {
      if (payload.type === "post_deleted") {
        setPosts((current) => current.filter((post) => post.id !== payload.postId));
        removeClientFeedPost(payload.postId);
        return;
      }

      setPosts((current) => {
        const existingPost = current.find((post) => post.id === payload.post.id);
        const normalizedPost = normalizeFeedPost(payload.post);
        const mergedPost = existingPost
          ? {
              ...normalizedPost,
              author: {
                ...normalizedPost.author,
                isFollowing:
                  existingPost.author.isFollowing ?? normalizedPost.author.isFollowing,
              },
            }
          : normalizedPost;

        let nextPosts: NormalizedPost[];
        if (payload.type === "post_created") {
          nextPosts = [mergedPost, ...current.filter((post) => post.id !== payload.post.id)];
          prependClientFeedPost(mergedPost);
        } else {
          nextPosts = current.map((post) => (post.id === payload.post.id ? mergedPost : post));
          updateClientFeedPost(mergedPost);
        }

        return nextPosts.sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        );
      });
    };

    channel.bind("feed-event", handleFeedEvent);

    return () => {
      channel.unbind("feed-event", handleFeedEvent);
      pusherClient.unsubscribe("feed-channel");
    };
  }, []);

  useEffect(() => {
    if (!hasMore || !nextCursor || !loadMoreRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (!target?.isIntersecting || isLoadingMore) {
          return;
        }

        setIsLoadingMore(true);

        void (async () => {
          try {
            const response = await fetch(
              `/api/feed?cursor=${encodeURIComponent(nextCursor)}`,
              {
                method: "GET",
                cache: "no-store",
              }
            );

            if (!response.ok) {
              throw new Error("Failed to load more posts");
            }

            const payload = (await response.json()) as {
              posts: FeedListProps["initialPosts"];
              nextCursor: string | null;
            };

            setPosts((current) => {
              const existingIds = new Set(current.map((post) => post.id));
              const appendedPosts = payload.posts
                .map((post) => normalizeFeedPost(post))
                .filter((post) => !existingIds.has(post.id));

              const nextAllPosts = [...current, ...appendedPosts];
              saveClientFeedStore(
                nextAllPosts,
                payload.nextCursor,
                Boolean(payload.nextCursor),
                window.scrollY
              );
              return nextAllPosts;
            });
            setNextCursor(payload.nextCursor);
            setHasMore(Boolean(payload.nextCursor));
          } catch (error) {
            console.error("Failed to load more posts:", error);
          } finally {
            setIsLoadingMore(false);
          }
        })();
      },
      {
        rootMargin: "320px 0px",
      }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoadingMore, nextCursor]);

  if (posts.length === 0) {
    return (
      <div className="p-8 text-center border-b border-border">
        <h2 className="text-xl font-semibold">No posts yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your feed will show posts here once someone shares something.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          viewerUserId={viewerUserId}
        />
      ))}

      <div ref={loadMoreRef} className="flex min-h-14 items-center justify-center p-4">
        {isLoadingMore ? (
          <div className="w-full divide-y divide-border">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 sm:p-5 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-muted shrink-0" />
                  <div className="space-y-2 flex-1">
                    <div className="h-3.5 w-32 rounded bg-muted" />
                    <div className="h-2.5 w-20 rounded bg-muted" />
                  </div>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="h-3 w-4/5 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : hasMore ? (
          <p className="text-xs text-muted-foreground">Scroll to load more</p>
        ) : posts.length > 0 ? (
          <p className="text-xs text-muted-foreground">You&apos;ve reached the end</p>
        ) : null}
      </div>
    </div>
  );
}

export default FeedList;
