"use server";

import prisma from "@/lib/prisma";
import { publishFeedEvent } from "@/lib/feed-events";
import { publishNotificationEvent } from "@/lib/notification-events";
import { getDbUserId } from "./user.action";
import { revalidatePath } from "next/cache";

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
  _count: {
    select: {
      likes: true,
      comments: true,
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
  _count: {
    likes: number;
    comments: number;
  };
};

async function getPostSnapshot(postId: string) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: postSnapshotInclude,
  });

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

function mapFeedPost(
  post: FeedPostRecord,
  viewerUserId: string | null
) {
  const { followers, _count, ...author } = post.author;

  return {
    ...post,
    author: {
      ...author,
      stats: {
        followers: _count.followers,
        posts: _count.posts,
      },
      isFollowing: viewerUserId ? (followers?.length ?? 0) > 0 : false,
    },
  };
}

async function getFeedPage({
  cursor,
  take = FEED_PAGE_SIZE,
}: FeedPageOptions = {}) {
  const viewerUserId = await getDbUserId();

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
          followers: viewerUserId
            ? {
                where: {
                  followerId: viewerUserId,
                },
                select: {
                  followerId: true,
                },
                take: 1,
              }
            : undefined,
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
      likes: {
        select: {
          userId: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
        },
      },
    },
  });

  const hasMore = posts.length > take;
  const pagePosts = hasMore ? posts.slice(0, take) : posts;

  return {
    posts: pagePosts.map((post) => mapFeedPost(post, viewerUserId)),
    nextCursor: hasMore ? pagePosts[pagePosts.length - 1]?.id ?? null : null,
  };
}

export async function createPost(content: string, image: string) {
  try {
    const userId = await getDbUserId();

    if (!userId) return;

    const author = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });

    const post = await prisma.post.create({
      data: {
        content,
        image,
        authorId: userId,
      },
    });

    revalidatePath("/"); // purge the cache for the home page
    if (author?.username) {
      revalidatePath(`/profile/${author.username}`);
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
    console.log("Error in getPosts", error);
    throw new Error("Failed to fetch posts");
  }
}

export async function getPostsPage(cursor?: string | null) {
  try {
    return await getFeedPage({ cursor });
  } catch (error) {
    console.log("Error in getPostsPage", error);
    throw new Error("Failed to fetch more posts");
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

    revalidatePath("/"); // purge the cache
    if (post.author.username) {
      revalidatePath(`/profile/${post.author.username}`);
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
