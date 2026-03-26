"use client";

import { useEffect, useState } from "react";
import PostCard from "@/components/feed/PostCard";

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

function FeedList({ initialPosts, viewerUserId }: FeedListProps) {
  const [posts, setPosts] = useState<NormalizedPost[]>(() =>
    initialPosts.map((post) => normalizeFeedPost(post))
  );

  useEffect(() => {
    const eventSource = new EventSource("/api/feed/stream");

    const handleFeedEvent = (event: MessageEvent<string>) => {
      const payload = JSON.parse(event.data) as
        | {
            type: "post_created" | "post_updated";
            post: FeedListProps["initialPosts"][number];
          }
        | {
            type: "post_deleted";
            postId: string;
          };

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

    eventSource.addEventListener("feed", handleFeedEvent as EventListener);
    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.removeEventListener("feed", handleFeedEvent as EventListener);
      eventSource.close();
    };
  }, []);

  if (posts.length === 0) {
    return (
      <div className="glass-panel rounded-[28px] p-8 text-center">
        <h2 className="text-xl font-semibold">No posts yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your feed will show posts here once someone shares something.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <PostCard
          key={`${post.id}:${post._count.likes}:${post._count.comments}`}
          post={post}
          viewerUserId={viewerUserId}
        />
      ))}
    </div>
  );
}

export default FeedList;
