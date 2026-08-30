"use server";

import prisma from "@/lib/prisma";
import { publishFeedEvent } from "@/lib/feed-events";
import { publishNotificationEvent } from "@/lib/notification-events";
import { getDbUserId } from "./user.action";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

const commentInclude = {
  author: {
    select: {
      id: true,
      username: true,
      image: true,
      name: true,
    },
  },
  likes: {
    select: {
      userId: true,
    },
  },
  replies: {
    include: {
      author: {
        select: {
          id: true,
          username: true,
          image: true,
          name: true,
        },
      },
      likes: {
        select: {
          userId: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc" as const,
    },
  },
} as const;

const postSnapshotInclude = {
  author: {
    select: {
      id: true,
      name: true,
      image: true,
      username: true,
      bio: true,
      location: true,
      website: true,
      _count: {
        select: {
          followers: true,
          posts: true,
        },
      },
    },
  },
  comments: {
    where: {
      parentId: null,
    },
    include: commentInclude,
    orderBy: {
      createdAt: "asc" as const,
    },
    take: 2,
  },
  likes: {
    select: {
      userId: true,
    },
  },
  bookmarks: {
    select: {
      userId: true,
    },
  },
  reposts: {
    select: {
      userId: true,
    },
  },
  _count: {
    select: {
      likes: true,
      comments: true,
      bookmarks: true,
      reposts: true,
    },
  },
} as const;

const FEED_PAGE_SIZE = 6;

type FeedPageOptions = {
  cursor?: string | null;
  take?: number;
};

type FeedPostRecord = {
  id: string;
  content: string | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
  authorId: string;
  author: {
    id: string;
    name: string | null;
    image: string | null;
    username: string;
    bio: string | null;
    location: string | null;
    website: string | null;
    followers?: {
      followerId: string;
    }[];
    _count: {
      followers: number;
      posts: number;
    };
  };
  comments: {
    id: string;
    content: string;
    createdAt: Date;
    author: {
      id: string;
      username: string;
      image: string | null;
      name: string | null;
    };
    likes: {
      userId: string;
    }[];
    replies: {
      id: string;
      content: string;
      createdAt: Date;
      author: {
        id: string;
        username: string;
        image: string | null;
        name: string | null;
      };
      likes: {
        userId: string;
      }[];
    }[];
  }[];
  likes: {
    userId: string;
  }[];
  bookmarks?: {
    userId: string;
  }[];
  reposts?: {
    userId: string;
  }[];
  _count: {
    likes: number;
    comments: number;
    bookmarks?: number;
    reposts?: number;
  };
};

async function getPostSnapshot(postId: string) {
  const getCachedSnapshot = unstable_cache(
    async (id: string) => {
      const post = await prisma.post.findUnique({
        where: { id },
        include: postSnapshotInclude,
      });
      return post;
    },
    ["post-snapshot", postId],
    { tags: [CACHE_TAGS.post(postId)], revalidate: 300 }
  );

  const post = await getCachedSnapshot(postId);
  if (!post) return null;

  const { _count, ...author } = post.author;

  return {
    ...post,
    author: {
      ...author,
      stats: {
        followers: _count.followers,
        posts: _count.posts,
      },
      isFollowing: false,
    },
  };
}

const getCachedFeedPosts = (cursor?: string | null, take: number = FEED_PAGE_SIZE) =>
  unstable_cache(
    async () => {
      const posts = await prisma.post.findMany({
        take: take + 1,
        ...(cursor
          ? {
              cursor: {
                id: cursor,
              },
              skip: 1,
            }
          : {}),
        orderBy: [
          {
            createdAt: "desc",
          },
          {
            id: "desc",
          },
        ],
        include: {
          author: {
            select: {
              id: true,
              name: true,
              image: true,
              username: true,
              bio: true,
              location: true,
              website: true,
              _count: {
                select: {
                  followers: true,
                  posts: true,
                },
              },
            },
          },
          comments: {
            where: {
              parentId: null,
            },
            include: commentInclude,
            orderBy: {
              createdAt: "asc",
            },
            take: 2,
          },
          _count: {
            select: {
              likes: true,
              comments: true,
              bookmarks: true,
              reposts: true,
            },
          },
        },
      });

      return posts;
    },
    ["feed-posts-page-global", cursor || "initial", take.toString()],
    { tags: [CACHE_TAGS.feed, CACHE_TAGS.posts], revalidate: 60 }
  )();

async function getFeedPage({
  cursor,
  take = FEED_PAGE_SIZE,
}: FeedPageOptions = {}) {
  const viewerUserId = await getDbUserId();
  const rawPosts = await getCachedFeedPosts(cursor, take);

  const hasMore = rawPosts.length > take;
  const pagePosts = hasMore ? rawPosts.slice(0, take) : rawPosts;

  const postIds = pagePosts.map((p) => p.id);
  const authorIds = pagePosts.map((p) => p.author.id);

  if (!viewerUserId || postIds.length === 0) {
    return {
      posts: pagePosts.map((post) => {
        const { _count, ...author } = post.author;
        return {
          ...post,
          likes: [],
          bookmarks: [],
          reposts: [],
          author: {
            ...author,
            stats: {
              followers: _count.followers,
              posts: _count.posts,
            },
            isFollowing: false,
          },
        };
      }),
      nextCursor: hasMore ? pagePosts[pagePosts.length - 1]?.id ?? null : null,
    };
  }

  // Dynamic batch lookup for the viewer's personal state only
  const [likedRows, bookmarkedRows, repostedRows, followRows] = await Promise.all([
    prisma.like.findMany({
      where: {
        userId: viewerUserId,
        postId: { in: postIds },
      },
      select: { postId: true },
    }),
    prisma.bookmark.findMany({
      where: {
        userId: viewerUserId,
        postId: { in: postIds },
      },
      select: { postId: true },
    }),
    prisma.repost.findMany({
      where: {
        userId: viewerUserId,
        postId: { in: postIds },
      },
      select: { postId: true },
    }),
    prisma.follows.findMany({
      where: {
        followerId: viewerUserId,
        followingId: { in: authorIds },
      },
      select: { followingId: true },
    }),
  ]);

  const likedSet = new Set(likedRows.map((r) => r.postId));
  const bookmarkedSet = new Set(bookmarkedRows.map((r) => r.postId));
  const repostedSet = new Set(repostedRows.map((r) => r.postId));
  const followingSet = new Set(followRows.map((r) => r.followingId));

  return {
    posts: pagePosts.map((post) => {
      const { _count, ...author } = post.author;
      return {
        ...post,
        likes: likedSet.has(post.id) ? [{ userId: viewerUserId }] : [],
        bookmarks: bookmarkedSet.has(post.id) ? [{ userId: viewerUserId }] : [],
        reposts: repostedSet.has(post.id) ? [{ userId: viewerUserId }] : [],
        author: {
          ...author,
          stats: {
            followers: _count.followers,
            posts: _count.posts,
          },
          isFollowing: followingSet.has(author.id),
        },
      };
    }),
    nextCursor: hasMore ? pagePosts[pagePosts.length - 1]?.id ?? null : null,
  };
}

export async function createPost(
  content: string,
  image: string,
  contentType: "TEXT" | "MARKDOWN" = "TEXT"
) {
  try {
    const userId = await getDbUserId();

    if (!userId) return;

    const author = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    const trimmedContent = content?.trim() || null;
    const trimmedImage = image?.trim() || null;
    const validContentType = contentType === "MARKDOWN" ? "MARKDOWN" : "TEXT";

    if (!trimmedContent && !trimmedImage) {
      return { success: false, error: "Post must contain text or an image" };
    }

    if (trimmedContent && trimmedContent.length > 30000) {
      return { success: false, error: "Post content exceeds maximum allowed length (30,000 characters)" };
    }

    const post = await prisma.post.create({
      data: {
        content: trimmedContent,
        contentType: validContentType,
        image: trimmedImage,
        authorId: userId,
      },
    });

    revalidatePath("/");
    revalidateTag(CACHE_TAGS.feed);
    revalidateTag(CACHE_TAGS.posts);
    if (author?.username) {
      revalidatePath(`/profile/${author.username}`);
      revalidateTag(CACHE_TAGS.profile(author.username));
    }
    const postSnapshot = await getPostSnapshot(post.id);
    if (postSnapshot) {
      publishFeedEvent({
        type: "post_created",
        post: postSnapshot,
      });
    }
    return { success: true, post };
  } catch (error) {
    console.error("Failed to create post:", error);
    return { success: false, error: "Failed to create post" };
  }
}

export async function getPosts() {
  try {
    const { posts } = await getFeedPage();
    return posts;
  } catch (error) {
    console.error("Error in getPosts:", error);
    return [];
  }
}

export async function getPostsPage(cursor?: string | null) {
  try {
    return await getFeedPage({ cursor });
  } catch (error) {
    console.error("Error in getPostsPage:", error);
    return { posts: [], nextCursor: null };
  }
}

export async function toggleLike(postId: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) {
      return { success: false, error: "Sign in required" };
    }

    // check if like exists
    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        authorId: true,
        author: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!post) throw new Error("Post not found");

    if (existingLike) {
      // unlike
      await prisma.like.delete({
        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
      });
    } else {
      // like and create notification (only if liking someone else's post)
      await prisma.$transaction([
        prisma.like.create({
          data: {
            userId,
            postId,
          },
        }),
        ...(post.authorId !== userId
          ? [
              prisma.notification.create({
                data: {
                  type: "LIKE",
                  userId: post.authorId, // recipient (post author)
                  creatorId: userId, // person who liked
                  postId,
                },
              }),
            ]
          : []),
      ]);

      if (post.authorId !== userId) {
        publishNotificationEvent(post.authorId, {
          type: "notifications_changed",
        });
      }
    }

    revalidateTag(CACHE_TAGS.post(postId));
    const postSnapshot = await getPostSnapshot(postId);
    if (postSnapshot) {
      publishFeedEvent({
        type: "post_updated",
        post: postSnapshot,
      });
    }
    return { success: true };
  } catch (error) {
    console.error("Failed to toggle like:", error);
    return { success: false, error: "Failed to toggle like" };
  }
}

export async function toggleBookmark(postId: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) {
      return { success: false, error: "Sign in required" };
    }

    const existingBookmark = await prisma.bookmark.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        authorId: true,
      },
    });

    if (!post) throw new Error("Post not found");

    if (existingBookmark) {
      await prisma.bookmark.delete({
        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
      });
    } else {
      await prisma.$transaction([
        prisma.bookmark.create({
          data: {
            userId,
            postId,
          },
        }),
        ...(post.authorId !== userId
          ? [
              prisma.notification.create({
                data: {
                  type: "BOOKMARK",
                  userId: post.authorId,
                  creatorId: userId,
                  postId,
                },
              }),
            ]
          : []),
      ]);

      if (post.authorId !== userId) {
        publishNotificationEvent(post.authorId, {
          type: "notifications_changed",
        });
      }
    }

    revalidateTag(CACHE_TAGS.post(postId));
    const postSnapshot = await getPostSnapshot(postId);
    if (postSnapshot) {
      publishFeedEvent({
        type: "post_updated",
        post: postSnapshot,
      });
    }

    return { success: true, isBookmarked: !existingBookmark };
  } catch (error) {
    console.error("Failed to toggle bookmark:", error);
    return { success: false, error: "Failed to toggle bookmark" };
  }
}

export async function toggleRepost(postId: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) {
      return { success: false, error: "Sign in required" };
    }

    const existingRepost = await prisma.repost.findUnique({
      where: {
        userId_postId: {
          userId,
          postId,
        },
      },
    });

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        authorId: true,
      },
    });

    if (!post) throw new Error("Post not found");

    if (existingRepost) {
      await prisma.repost.delete({
        where: {
          userId_postId: {
            userId,
            postId,
          },
        },
      });
    } else {
      await prisma.$transaction([
        prisma.repost.create({
          data: {
            userId,
            postId,
          },
        }),
        ...(post.authorId !== userId
          ? [
              prisma.notification.create({
                data: {
                  type: "REPOST",
                  userId: post.authorId,
                  creatorId: userId,
                  postId,
                },
              }),
            ]
          : []),
      ]);

      if (post.authorId !== userId) {
        publishNotificationEvent(post.authorId, {
          type: "notifications_changed",
        });
      }
    }

    revalidatePath("/");
    revalidateTag(CACHE_TAGS.post(postId));
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    if (currentUser?.username) {
      revalidatePath(`/profile/${currentUser.username}`);
      revalidateTag(CACHE_TAGS.profile(currentUser.username));
    }

    const postSnapshot = await getPostSnapshot(postId);
    if (postSnapshot) {
      publishFeedEvent({
        type: "post_updated",
        post: postSnapshot,
      });
    }

    return { success: true, isReposted: !existingRepost };
  } catch (error) {
    console.error("Failed to toggle repost:", error);
    return { success: false, error: "Failed to toggle repost" };
  }
}

export async function createComment(postId: string, content: string) {
  return createCommentInternal({ postId, content });
}

export async function replyToComment(postId: string, parentCommentId: string, content: string) {
  return createCommentInternal({
    postId,
    content,
    parentCommentId,
  });
}

async function createCommentInternal({
  postId,
  content,
  parentCommentId,
}: {
  postId: string;
  content: string;
  parentCommentId?: string;
}) {
  try {
    const userId = await getDbUserId();
    let replyRecipientId: string | null = null;
    let notificationRecipientId: string | null = null;

    if (!userId) {
      return { success: false, error: "Sign in required" };
    }
    const normalizedContent = content.trim();
    if (!normalizedContent) throw new Error("Content is required");

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        authorId: true,
        author: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!post) throw new Error("Post not found");

    if (parentCommentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: parentCommentId },
        select: { id: true, postId: true, authorId: true },
      });

      if (!parentComment || parentComment.postId !== postId) {
        throw new Error("Parent comment not found");
      }
      replyRecipientId = parentComment.authorId;
    }

    // Create comment and notification in a transaction
    const [comment] = await prisma.$transaction(async (tx) => {
      // Create comment first
      const newComment = await tx.comment.create({
        data: {
          content: normalizedContent,
          authorId: userId,
          postId,
          parentId: parentCommentId,
        },
        include: commentInclude,
      });

      // Replies notify the comment author; top-level comments notify the post author.
      if (parentCommentId) {
        if (replyRecipientId && replyRecipientId !== userId) {
          notificationRecipientId = replyRecipientId;
          await tx.notification.create({
            data: {
              type: "REPLY",
              userId: replyRecipientId,
              creatorId: userId,
              postId,
              commentId: newComment.id,
            },
          });
        }
      } else if (post.authorId !== userId) {
        notificationRecipientId = post.authorId;
        await tx.notification.create({
          data: {
            type: "COMMENT",
            userId: post.authorId,
            creatorId: userId,
            postId,
            commentId: newComment.id,
          },
        });
      }

      return [newComment];
    });

    if (notificationRecipientId) {
      publishNotificationEvent(notificationRecipientId, {
        type: "notifications_changed",
      });
    }

    revalidateTag(CACHE_TAGS.post(postId));
    revalidateTag(CACHE_TAGS.feed);
    const postSnapshot = await getPostSnapshot(postId);
    if (postSnapshot) {
      publishFeedEvent({
        type: "post_updated",
        post: postSnapshot,
      });
    }
    return { success: true, comment };
  } catch (error) {
    console.error("Failed to create comment:", error);
    return { success: false, error: "Failed to create comment" };
  }
}

export async function toggleCommentLike(commentId: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) {
      return { success: false, error: "Sign in required" };
    }

    const existingLike = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        authorId: true,
        postId: true,
        post: {
          select: {
            author: {
              select: {
                username: true,
              },
            },
          },
        },
      },
    });

    if (!comment) {
      throw new Error("Comment not found");
    }

    if (existingLike) {
      await prisma.commentLike.delete({
        where: {
          userId_commentId: {
            userId,
            commentId,
          },
        },
      });
    } else {
      await prisma.$transaction([
        prisma.commentLike.create({
          data: {
            userId,
            commentId,
          },
        }),
        ...(comment.authorId !== userId
          ? [
              prisma.notification.create({
                data: {
                  type: "COMMENT_LIKE",
                  userId: comment.authorId,
                  creatorId: userId,
                  postId: comment.postId,
                  commentId,
                },
              }),
            ]
          : []),
      ]);

      if (comment.authorId !== userId) {
        publishNotificationEvent(comment.authorId, {
          type: "notifications_changed",
        });
      }
    }

    revalidateTag(CACHE_TAGS.post(comment.postId));
    const postSnapshot = await getPostSnapshot(comment.postId);
    if (postSnapshot) {
      publishFeedEvent({
        type: "post_updated",
        post: postSnapshot,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to toggle comment like:", error);
    return { success: false, error: "Failed to update comment like" };
  }
}

export async function deletePost(postId: string) {
  try {
    const userId = await getDbUserId();

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        authorId: true,
        author: {
          select: {
            username: true,
          },
        },
      },
    });

    if (!post) throw new Error("Post not found");
    if (post.authorId !== userId)
      throw new Error("Unauthorized - no delete permission");

    await prisma.post.delete({
      where: { id: postId },
    });

    revalidatePath("/");
    revalidateTag(CACHE_TAGS.feed);
    revalidateTag(CACHE_TAGS.posts);
    revalidateTag(CACHE_TAGS.post(postId));
    if (post.author.username) {
      revalidatePath(`/profile/${post.author.username}`);
      revalidateTag(CACHE_TAGS.profile(post.author.username));
    }
    publishFeedEvent({
      type: "post_deleted",
      postId,
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to delete post:", error);
    return { success: false, error: "Failed to delete post" };
  }
}

export async function getMoreComments(postId: string, skip: number = 2) {
  try {
    const comments = await prisma.comment.findMany({
      where: {
        postId,
        parentId: null,
      },
      include: commentInclude,
      orderBy: {
        createdAt: "asc",
      },
      skip,
      take: 20,
    });
    return { success: true, comments };
  } catch (error) {
    console.error("Failed to load more comments:", error);
    return { success: false, error: "Failed to load more comments" };
  }
}
