"use server";

import prisma from "@/lib/prisma";
import { publishNotificationEvent } from "@/lib/notification-events";
import { auth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { cache } from "react";
import { AppCache } from "@/lib/cache";
import { CACHE_TAGS } from "@/lib/cache-tags";

const profileCommentInclude = {
  author: {
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
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
          name: true,
          username: true,
          image: true,
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

function isTrustedProfileImageUrl(rawUrl: string) {
  try {
    const imageUrl = new URL(rawUrl);
    return (
      imageUrl.protocol === "https:" &&
      (
        imageUrl.hostname === "res.cloudinary.com" ||
        imageUrl.hostname === "blob.vercel-storage.com" ||
        imageUrl.hostname.endsWith(".blob.vercel-storage.com")
      )
    );
  } catch {
    return false;
  }
}

export const getCurrentUserContext = cache(async () => {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return null;
  }

  // 1. Fast lookup from database by clerkId
  let dbUser = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      _count: {
        select: { followers: true, following: true, posts: true },
      },
    },
  });

  if (dbUser) {
    return {
      clerkUser: null,
      dbUser,
      profileHref: `/profile/${dbUser.username}`,
    };
  }

  // 2. If user not yet in DB, fetch from Clerk once to register
  const clerkUser = await currentUser();
  if (!clerkUser) {
    return null;
  }

  const username =
    clerkUser.username ?? clerkUser.emailAddresses[0].emailAddress.split("@")[0];
  const email = clerkUser.emailAddresses[0].emailAddress;
  const name = `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null;

  const existingByEmail = await prisma.user.findUnique({
    where: { email },
  });

  if (existingByEmail) {
    dbUser = await prisma.user.update({
      where: { email },
      data: { clerkId: clerkUser.id, name, image: clerkUser.imageUrl },
      include: {
        _count: {
          select: { followers: true, following: true, posts: true },
        },
      },
    });
  } else {
    // Need to handle potential username collisions
    let finalUsername = username;
    const existingByUsername = await prisma.user.findUnique({
      where: { username },
    });
    if (existingByUsername) {
      finalUsername = `${username}_${Math.random().toString(36).slice(2, 6)}`;
    }

    dbUser = await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        name,
        username: finalUsername,
        email,
        image: clerkUser.imageUrl,
      },
      include: {
        _count: {
          select: { followers: true, following: true, posts: true },
        },
      },
    });
  }

  return {
    clerkUser,
    dbUser,
    profileHref: `/profile/${dbUser.username}`,
  };
});

export async function getUserByClerkId(clerkId: string) {
  return prisma.user.findUnique({
    where: {
      clerkId,
    },
    include: {
      _count: {
        select: {
          followers: true,
          following: true,
          posts: true,
        },
      },
    },
  });
}

const getCachedRawProfile = (username: string) =>
  unstable_cache(
    async () => {
      const user = await prisma.user.findUnique({
        where: {
          username,
        },
        include: {
          _count: {
            select: {
              followers: true,
              following: true,
              posts: true,
            },
          },
          posts: {
            orderBy: {
              createdAt: "desc",
            },
            include: {
              author: {
                select: {
                  id: true,
                  name: true,
                  username: true,
                  image: true,
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
                include: profileCommentInclude,
                orderBy: {
                  createdAt: "asc",
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
            },
          },
        },
      });

      if (!user) {
        return null;
      }

      const [friends, userReposts] = await Promise.all([
        prisma.user.findMany({
          where: {
            AND: [
              {
                followers: {
                  some: {
                    followerId: user.id,
                  },
                },
              },
              {
                following: {
                  some: {
                    followingId: user.id,
                  },
                },
              },
            ],
          },
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
          orderBy: [{ name: "asc" }, { username: "asc" }],
        }),
        prisma.repost.findMany({
          where: {
            userId: user.id,
          },
          orderBy: {
            createdAt: "desc",
          },
          include: {
            post: {
              include: {
                author: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
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
                  include: profileCommentInclude,
                  orderBy: {
                    createdAt: "asc",
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
              },
            },
          },
        }),
      ]);

      return { user, friends, userReposts };
    },
    ["raw-user-profile-global", username],
    { tags: [CACHE_TAGS.profile(username)], revalidate: 300 }
  )();

export async function getProfileByUsername(username: string) {
  try {
    const viewerIdPromise = getDbUserId();
    const rawDataPromise = getCachedRawProfile(username);

    const [viewerId, rawData] = await Promise.all([viewerIdPromise, rawDataPromise]);

    if (!rawData || !rawData.user) {
      return null;
    }

    const { user, friends, userReposts } = rawData;
    const isOwnProfile = viewerId === user.id;

    // Collect all post IDs displayed on this profile (authored + reposts)
    const allProfilePostIds = [
      ...user.posts.map((p) => p.id),
      ...userReposts.filter((r) => r.post).map((r) => r.post.id),
    ];

    // Batch query viewer-specific state if logged in
    const [follow, viewerFollowRows, likedRows, bookmarkedRows, repostedRows] = viewerId
      ? await Promise.all([
          !isOwnProfile
            ? prisma.follows.findUnique({
                where: {
                  followerId_followingId: {
                    followerId: viewerId,
                    followingId: user.id,
                  },
                },
              })
            : Promise.resolve(null),
          friends.length > 0
            ? prisma.follows.findMany({
                where: {
                  followerId: viewerId,
                  followingId: {
                    in: friends.map((friend) => friend.id),
                  },
                },
                select: {
                  followingId: true,
                },
              })
            : Promise.resolve([]),
          allProfilePostIds.length > 0
            ? prisma.like.findMany({
                where: {
                  userId: viewerId,
                  postId: { in: allProfilePostIds },
                },
                select: { postId: true },
              })
            : Promise.resolve([]),
          allProfilePostIds.length > 0
            ? prisma.bookmark.findMany({
                where: {
                  userId: viewerId,
                  postId: { in: allProfilePostIds },
                },
                select: { postId: true },
              })
            : Promise.resolve([]),
          allProfilePostIds.length > 0
            ? prisma.repost.findMany({
                where: {
                  userId: viewerId,
                  postId: { in: allProfilePostIds },
                },
                select: { postId: true },
              })
            : Promise.resolve([]),
        ])
      : [null, [], [], [], []];

    const viewerFollowingIds = new Set(viewerFollowRows.map((f) => f.followingId));
    const likedSet = new Set(likedRows.map((l) => l.postId));
    const bookmarkedSet = new Set(bookmarkedRows.map((b) => b.postId));
    const repostedSet = new Set(repostedRows.map((r) => r.postId));

    const mapPostWithViewerState = (post: any, repostedBy: any, timelineDate: Date) => ({
      ...post,
      likes: viewerId && likedSet.has(post.id) ? [{ userId: viewerId }] : [],
      bookmarks: viewerId && bookmarkedSet.has(post.id) ? [{ userId: viewerId }] : [],
      reposts: viewerId && repostedSet.has(post.id) ? [{ userId: viewerId }] : [],
      repostedBy,
      timelineDate,
    });

    const authoredPosts = user.posts.map((post) =>
      mapPostWithViewerState(post, null, post.createdAt)
    );

    const repostedPosts = userReposts
      .filter((r) => r.post)
      .map((r) =>
        mapPostWithViewerState(
          r.post,
          {
            id: user.id,
            name: user.name,
            username: user.username,
          },
          r.createdAt
        )
      );

    const combinedPosts = [...authoredPosts, ...repostedPosts].sort(
      (a, b) => new Date(b.timelineDate).getTime() - new Date(a.timelineDate).getTime()
    );

    return {
      ...user,
      posts: combinedPosts,
      viewerUserId: viewerId,
      isOwnProfile,
      isFollowing: !!follow,
      friends: friends.map((friend) => ({
        ...friend,
        isFollowing: viewerId === friend.id ? false : viewerFollowingIds.has(friend.id),
      })),
      friendCount: friends.length,
    };
  } catch (error) {
    console.log("Error in getProfileByUsername", error);
    return null;
  }
}

export const getDbUserId = cache(async () => {
  const context = await getCurrentUserContext();
  return context?.dbUser.id ?? null;
});

export async function getRandomUsers() {
  try {
    const userId = await getDbUserId();

    if (!userId) return [];

    const getCachedRecommendations = unstable_cache(
      async (currentUid: string) => {
        const allOtherUsers = await prisma.user.findMany({
          where: {
            NOT: { id: currentUid },
          },
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            following: {
              where: {
                followingId: currentUid,
              },
            },
            followers: {
              where: {
                followerId: currentUid,
              },
            },
          },
        });

        allOtherUsers.sort((a, b) => {
          const aFollowsUs = a.following.length > 0 ? 1 : 0;
          const bFollowsUs = b.following.length > 0 ? 1 : 0;
          return bFollowsUs - aFollowsUs;
        });

        return allOtherUsers.slice(0, 3).map(({ following, followers, ...rest }) => ({
          ...rest,
          isFollowing: followers.length > 0,
        }));
      },
      ["who-to-follow", userId],
      { tags: [CACHE_TAGS.whoToFollow], revalidate: 120 }
    );

    return await getCachedRecommendations(userId);
  } catch (error) {
    console.log("Error fetching random users", error);
    return [];
  }
}

function normalizeSearchValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9ก-๙@._\s-]/g, "").trim();
}

function compactSearchValue(value: string) {
  return normalizeSearchValue(value).replace(/\s+/g, "");
}

function levenshteinDistance(left: string, right: string) {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const matrix: number[][] = [];

  for (let i = 0; i <= left.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= right.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= left.length; i++) {
    for (let j = 1; j <= right.length; j++) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[left.length][right.length];
}

function isSubsequence(query: string, target: string) {
  let targetIndex = 0;
  for (let queryIndex = 0; queryIndex < query.length; queryIndex++) {
    targetIndex = target.indexOf(query[queryIndex], targetIndex);
    if (targetIndex === -1) return false;
    targetIndex += 1;
  }
  return true;
}

function scoreCandidate(query: string, target: string) {
  if (!query || !target) return 0;

  const normalizedQuery = compactSearchValue(query.replace(/^@/, ""));
  const normalizedTarget = compactSearchValue(target.replace(/^@/, ""));

  if (!normalizedQuery || !normalizedTarget) return 0;

  if (normalizedTarget === normalizedQuery) return 120;
  if (normalizedTarget.startsWith(normalizedQuery)) return 95;
  if (normalizedTarget.includes(normalizedQuery)) return 80;
  if (isSubsequence(normalizedQuery, normalizedTarget)) {
    return Math.max(44, 70 - (normalizedTarget.length - normalizedQuery.length));
  }

  const distance = levenshteinDistance(normalizedQuery, normalizedTarget);
  const maxLength = Math.max(normalizedQuery.length, normalizedTarget.length);

  if (distance <= 2) return 58 - distance * 6;
  if (maxLength <= 12 && distance <= 3) return 38 - distance * 4;

  return 0;
}

function scoreUserMatch(
  query: string,
  user: {
    username: string;
    name: string | null;
  }
) {
  const normalizedQuery = normalizeSearchValue(query);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

  const usernameScore = scoreCandidate(normalizedQuery, user.username);
  const nameScore = scoreCandidate(normalizedQuery, user.name || "");

  const tokenScore = queryTokens.reduce((bestScore, token) => {
    const usernameTokenScore = scoreCandidate(token, user.username);
    const nameTokenScore = scoreCandidate(token, user.name || "");
    return Math.max(bestScore, usernameTokenScore, nameTokenScore);
  }, 0);

  const exactAtUsername = compactSearchValue(user.username) === compactSearchValue(query.replace(/^@/, ""));

  return Math.max(usernameScore + 10, nameScore, tokenScore + 6) + (exactAtUsername ? 12 : 0);
}

export async function searchUsers(query: string) {
  try {
    const normalizedQuery = query.trim();

    if (normalizedQuery.length < 2) {
      return [];
    }

    const cacheKey = `search:users:${normalizedQuery.toLowerCase()}`;
    const cached = await AppCache.get<{ id: string; name: string | null; username: string; image: string | null }[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const context = await getCurrentUserContext();
    const currentUserId = context?.dbUser.id;

    const queryTokens = normalizeSearchValue(normalizedQuery)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 4);

    const searchClauses = [
      {
        username: {
          contains: normalizedQuery.replace(/^@/, ""),
          mode: "insensitive" as const,
        },
      },
      {
        name: {
          contains: normalizedQuery,
          mode: "insensitive" as const,
        },
      },
      ...queryTokens.flatMap((token) => [
        {
          username: {
            contains: token.replace(/^@/, ""),
            mode: "insensitive" as const,
          },
        },
        {
          name: {
            contains: token,
            mode: "insensitive" as const,
          },
        },
      ]),
    ];

    const users = await prisma.user.findMany({
      where: {
        AND: [
          currentUserId ? { NOT: { id: currentUserId } } : {},
          {
            OR: searchClauses,
          },
        ],
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
      },
      take: 40,
    });

    const rankedUsers = users
      .map((user) => ({
        ...user,
        score: scoreUserMatch(normalizedQuery, user),
      }))
      .filter((user) => user.score > 0)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        const leftName = (left.name || left.username).toLowerCase();
        const rightName = (right.name || right.username).toLowerCase();
        return leftName.localeCompare(rightName);
      })
      .slice(0, 8)
      .map(({ score: _score, ...user }) => user);

    await AppCache.set(cacheKey, rankedUsers, 60);

    return rankedUsers;
  } catch (error) {
    console.log("Error in searchUsers", error);
    return [];
  }
}

export async function toggleFollow(targetUserId: string) {
  try {
    const userId = await getDbUserId();

    if (!userId) return;

    if (userId === targetUserId) throw new Error("You cannot follow yourself");

    const existingFollow = await prisma.follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId,
        },
      },
    });

    if (existingFollow) {
      // unfollow
      await prisma.follows.delete({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: targetUserId,
          },
        },
      });
    } else {
      // follow
      await prisma.$transaction([
        prisma.follows.create({
          data: {
            followerId: userId,
            followingId: targetUserId,
          },
        }),

        prisma.notification.create({
          data: {
            type: "FOLLOW",
            userId: targetUserId, // user being followed
            creatorId: userId, // user following
          },
        }),
      ]);

      publishNotificationEvent(targetUserId, {
        type: "notifications_changed",
      });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { username: true },
    });

    revalidatePath("/");
    revalidateTag(CACHE_TAGS.whoToFollow);
    if (targetUser?.username) {
      revalidatePath(`/profile/${targetUser.username}`);
      revalidateTag(CACHE_TAGS.profile(targetUser.username));
    }

    const followerCount = await prisma.follows.count({
      where: {
        followingId: targetUserId,
      },
    });

    return {
      success: true,
      isFollowing: !existingFollow,
      followerCount,
    };
  } catch (error) {
    console.log("Error in toggleFollow", error);
    return { success: false, error: "Error toggling follow" };
  }
}

export async function updateProfile({
  name,
  bio,
  location,
  website,
  image,
}: {
  name: string;
  bio: string;
  location: string;
  website: string;
  image: string;
}) {
  try {
    const { userId: clerkId } = await auth();
    const userId = await getDbUserId();

    if (!userId || !clerkId) {
      return { success: false, error: "Sign in required" };
    }

    const normalizedName = name.trim().slice(0, 80);
    const normalizedBio = bio.trim().slice(0, 280);
    const normalizedLocation = location.trim().slice(0, 80);
    const normalizedWebsite = website.trim().slice(0, 160);
    const websiteValue =
      normalizedWebsite.length > 0 &&
      !normalizedWebsite.startsWith("http://") &&
      !normalizedWebsite.startsWith("https://")
        ? `https://${normalizedWebsite}`
        : normalizedWebsite;

    const updatedUser = await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        name: normalizedName || null,
        bio: normalizedBio || null,
        location: normalizedLocation || null,
        website: websiteValue || null,
        image: image.trim() || null,
      },
      select: {
        username: true,
      },
    });

    try {
      const client = await clerkClient();
      await client.users.updateUser(clerkId, {
        firstName: normalizedName ? normalizedName.split(" ")[0] : "",
        lastName: normalizedName ? normalizedName.split(" ").slice(1).join(" ") : "",
      });

      if (image.trim()) {
        try {
          const imageUrl = image.trim();
          if (isTrustedProfileImageUrl(imageUrl)) {
            const res = await fetch(imageUrl);
            if (res.ok) {
              const blob = await res.blob();
              const file = new File([blob], "profile.jpg", {
                type: blob.type || "image/jpeg",
              });
              await client.users.updateUserProfileImage(clerkId, { file });
            }
          } else {
            console.warn("SSRF Prevention: Blocked fetching from unauthorized URL:", image);
          }
        } catch (urlError) {
          console.error("Invalid image URL provided:", urlError);
        }
      }
    } catch (clerkError) {
      console.error("Error syncing profile to Clerk:", clerkError);
    }

    revalidatePath("/");
    revalidatePath(`/profile/${updatedUser.username}`);
    revalidateTag(CACHE_TAGS.profile(updatedUser.username));
    revalidateTag(CACHE_TAGS.whoToFollow);
    return { success: true };
  } catch (error) {
    console.log("Error in updateProfile", error);
    return { success: false, error: "Error updating profile" };
  }
}
