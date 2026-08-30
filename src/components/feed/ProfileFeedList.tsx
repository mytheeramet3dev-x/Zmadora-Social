"use client";

import { useEffect, useState } from "react";
import PostCard from "@/components/feed/PostCard";
import { pusherClient } from "@/lib/pusher-client";

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
    contentType?: "TEXT" | "MARKDOWN" | string;
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
    bookmarks?: {
      userId: string;
    }[];
    reposts?: {
      userId: string;
    }[];
    repostedBy?: {
      id: string;
      name: string | null;
      username: string;
    } | null;
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
  viewerUserId: string | null;
};

type NormalizedPost = ReturnType<typeof normalizeProfilePost>;

function normalizeProfilePost(
  post: any,
  profileMeta: ProfileFeedListProps["profileMeta"]
) {
  const likes = post.likes || [];
  const bookmarks = post.bookmarks || [];
  const reposts = post.reposts || [];
  const comments = post.comments || [];

  return {
    ...post,
    id: post.id,
    content: post.content,
    image: post.image,
    createdAt: new Date(post.createdAt),
    authorId: post.authorId,
    repostedBy: post.repostedBy ?? null,
    author: {
      id: post.author.id,
      name: post.author.name,
      username: post.author.username,
      image: post.author.image,
      bio: post.author.bio ?? profileMeta.bio,
      location: post.author.location ?? profileMeta.location,
      website: post.author.website ?? profileMeta.website,
      stats: {
        followers: post.author.stats?.followers ?? post.author._count?.followers ?? profileMeta.followers,
        posts: post.author.stats?.posts ?? post.author._count?.posts ?? profileMeta.posts,
      },
      isFollowing: post.author.id === profileMeta.bio ? profileMeta.isFollowing : (post.author.isFollowing ?? false),
    },
    likes,
    bookmarks,
    reposts,
    comments: comments.map((comment: any) => ({
      ...comment,
      createdAt: new Date(comment.createdAt),
      replies: comment.replies?.map((reply: any) => ({
        ...reply,
        createdAt: new Date(reply.createdAt),
      })),
    })),
    _count: {
      likes: post._count?.likes ?? likes.length,
      comments: post._count?.comments ?? comments.length,
      bookmarks: post._count?.bookmarks ?? bookmarks.length,
      reposts: post._count?.reposts ?? reposts.length,
    },
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
    const channel = pusherClient.subscribe("feed-channel");

    const handleFeedEvent = (payload: any) => {
      if (payload.type === "post_deleted") {
        setPosts((current) => current.filter((post) => post.id !== payload.postId));
        return;
      }

      if (payload.post?.authorId !== profileUserId) {
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

    channel.bind("feed-event", handleFeedEvent);

    return () => {
      channel.unbind("feed-event", handleFeedEvent);
      pusherClient.unsubscribe("feed-channel");
    };
  }, [profileMeta, profileUserId]);

  if (posts.length === 0) {
    return (
      <div className="rounded-2xl p-8 text-center border border-border bg-muted/20">
        <p className="text-lg font-medium">No posts yet</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Posts from this user will show up here once they share something.
        </p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border rounded-2xl border border-border overflow-hidden bg-card/20">
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          viewerUserId={viewerUserId}
        />
      ))}
    </div>
  );
}

export default ProfileFeedList;
