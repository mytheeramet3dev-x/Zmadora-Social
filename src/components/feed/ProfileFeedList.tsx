"use client";

import { useEffect, useState } from "react";
import PostCard from "@/components/feed/PostCard";

type ProfileFeedListProps = {
  profileUserId: string;
  profileMeta: {
    bio: string | null;
    location: string | null;
    website: string | null;
    followers: number;
    posts: number;
    isFollowing: boolean;
  };
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

type IncomingPost = ProfileFeedListProps["initialPosts"][number];
type NormalizedPost = ReturnType<typeof normalizeProfilePost>;

function normalizeProfilePost(post: IncomingPost, profileMeta: ProfileFeedListProps["profileMeta"]) {
  return {
    ...post,
    createdAt: new Date(post.createdAt),
    author: {
      ...post.author,
      bio: profileMeta.bio,
      location: profileMeta.location,
      website: profileMeta.website,
      stats: {
        followers: profileMeta.followers,
        posts: profileMeta.posts,
      },
      isFollowing: profileMeta.isFollowing,
    },
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

function ProfileFeedList({
  profileUserId,
  profileMeta,
  initialPosts,
  viewerUserId,
}: ProfileFeedListProps) {
  const [posts, setPosts] = useState<NormalizedPost[]>(() =>
    initialPosts.map((post) => normalizeProfilePost(post, profileMeta))
  );

  useEffect(() => {
    setPosts(initialPosts.map((post) => normalizeProfilePost(post, profileMeta)));
  }, [initialPosts, profileMeta]);

  useEffect(() => {
    const eventSource = new EventSource("/api/feed/stream");

    const handleFeedEvent = (event: MessageEvent<string>) => {
      const payload = JSON.parse(event.data) as
        | {
            type: "post_created" | "post_updated";
            post: IncomingPost;
          }
        | {
            type: "post_deleted";
            postId: string;
          };

      if (payload.type === "post_deleted") {
        setPosts((current) => current.filter((post) => post.id !== payload.postId));
        return;
      }

      if (payload.post.authorId !== profileUserId) {
        return;
      }

      setPosts((current) => {
        const normalizedPost = normalizeProfilePost(payload.post, profileMeta);
        const exists = current.some((post) => post.id === normalizedPost.id);
        const nextPosts = exists
          ? current.map((post) => (post.id === normalizedPost.id ? normalizedPost : post))
          : [normalizedPost, ...current];

        return nextPosts.sort(
          (left, right) =>
            new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
        );
      });
    };

    eventSource.addEventListener("feed", handleFeedEvent as EventListener);

    return () => {
      eventSource.removeEventListener("feed", handleFeedEvent as EventListener);
      eventSource.close();
    };
  }, [profileMeta, profileUserId]);

  if (posts.length === 0) {
    return (
      <div className="glass-panel rounded-[28px] p-8 text-center">
        <p className="text-lg font-medium">No posts yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Posts from this user will show up here once they share something.
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

export default ProfileFeedList;
