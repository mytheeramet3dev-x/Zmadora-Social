"use client";

import { useEffect, useRef, useState } from "react";
import PostCard from "@/components/feed/PostCard";
import { Loader2Icon } from "lucide-react";
import { pusherClient } from "@/lib/pusher-client";

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
    };
  }[];
  initialCursor?: string | null;
  viewerUserId?: string | null;
};

type NormalizedPost = ReturnType<typeof normalizeFeedPost>;

function normalizeFeedPost(post: FeedListProps["initialPosts"][number]) {
  return {
    ...post,
    createdAt: new Date(post.createdAt),
    comments: post.comments.map((comment) => ({
      ...comment,
      createdAt: new Date(comment.createdAt),
      replies: comment.replies?.map((reply) => ({
        ...reply,
        createdAt: new Date(reply.createdAt),
      })),
    })),
  };
}

function FeedList({
  initialPosts,
  initialCursor = null,
  viewerUserId,
}: FeedListProps) {
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const [posts, setPosts] = useState<NormalizedPost[]>(() =>
    initialPosts.map((post) => normalizeFeedPost(post))
  );
  const [nextCursor, setNextCursor] = useState<string | null>(initialCursor);
  const [hasMore, setHasMore] = useState(Boolean(initialCursor));
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  useEffect(() => {
    const channel = pusherClient.subscribe("feed-channel");

    const handleFeedEvent = (payload: any) => {
      if (payload.type === "post_deleted") {
        setPosts((current) => current.filter((post) => post.id !== payload.postId));
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

        const nextPosts =
          payload.type === "post_created"
            ? [mergedPost, ...current.filter((post) => post.id !== payload.post.id)]
            : current.map((post) => (post.id === payload.post.id ? mergedPost : post));

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

              return [...current, ...appendedPosts];
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
          key={`${post.id}:${post._count.likes}:${post._count.comments}`}
          post={post}
          viewerUserId={viewerUserId}
        />
      ))}

      <div ref={loadMoreRef} className="flex min-h-14 items-center justify-center">
        {isLoadingMore ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2Icon className="h-4 w-4 animate-spin" />
            Loading more posts...
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
