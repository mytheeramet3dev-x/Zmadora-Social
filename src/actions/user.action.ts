"use server";

import prisma from "@/lib/prisma";
import { publishNotificationEvent } from "@/lib/notification-events";
import { auth, currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { cache } from "react";

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

export const getCurrentUserContext = cache(async () => {
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const username =
    clerkUser.username ?? clerkUser.emailAddresses[0].emailAddress.split("@")[0];

  const dbUser = await prisma.user.upsert({
    where: {
      clerkId: clerkUser.id,
    },
    update: {
      name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
      username,
      email: clerkUser.emailAddresses[0].emailAddress,
    },
    create: {
      clerkId: clerkUser.id,
      name: `${clerkUser.firstName || ""} ${clerkUser.lastName || ""}`.trim() || null,
      username,
      email: clerkUser.emailAddresses[0].emailAddress,
      image: clerkUser.imageUrl,
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

export async function getProfileByUsername(username: string) {
  try {
    const viewerIdPromise = getDbUserId();
    const userPromise = prisma.user.findUnique({
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
              },
            },
            likes: {
              select: {
                userId: true,
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
              },
            },
          },
        },
      },
    });

    const [viewerId, user] = await Promise.all([viewerIdPromise, userPromise]);

    if (!user) {
      return null;
    }

    const isOwnProfile = viewerId === user.id;

    const [follow, friends] = await Promise.all([
      viewerId && !isOwnProfile
        ? prisma.follows.findUnique({
            where: {
              followerId_followingId: {
                followerId: viewerId,
                followingId: user.id,
              },
            },
          })
        : Promise.resolve(null),
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
    ]);

    const viewerFollowingIds = viewerId && friends.length > 0
      ? new Set(
          (
            await prisma.follows.findMany({
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
          ).map((viewerFollow) => viewerFollow.followingId)
        )
      : new Set<string>();

    return {
      ...user,
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

export async function getDbUserId() {
  const context = await getCurrentUserContext();
  return context?.dbUser.id ?? null;
}

export async function getRandomUsers() {
  try {
    const context = await getCurrentUserContext();
    const userId = context?.dbUser.id;

    if (!userId) return [];

    // get 3 random users exclude ourselves & users that we already follow
    const randomUsers = await prisma.user.findMany({
      where: {
        AND: [
          { NOT: { id: userId } },
          {
            NOT: {
              followers: {
                some: {
                  followerId: userId,
                },
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
        _count: {
          select: {
            followers: true,
          },
        },
      },
      take: 3,
    });

    return randomUsers;
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

function levenshteinDistance(a: string, b: string) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const rows = a.length + 1;
  const cols = b.length + 1;
  const dp = Array.from({ length: rows }, () => Array<number>(cols).fill(0));

  for (let row = 0; row < rows; row += 1) dp[row][0] = row;
  for (let col = 0; col < cols; col += 1) dp[0][col] = col;

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1;
      dp[row][col] = Math.min(
        dp[row - 1][col] + 1,
        dp[row][col - 1] + 1,
        dp[row - 1][col - 1] + cost
      );
    }
  }

  return dp[a.length][b.length];
}

function isSubsequence(query: string, target: string) {
  let queryIndex = 0;

  for (const char of target) {
    if (char === query[queryIndex]) {
      queryIndex += 1;
      if (queryIndex === query.length) {
        return true;
      }
    }
  }

  return query.length === 0;
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
    if (targetUser?.username) {
      revalidatePath(`/profile/${targetUser.username}`);
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
    const userId = await getDbUserId();

    if (!userId) {
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

    revalidatePath("/");
    revalidatePath(`/profile/${updatedUser.username}`);
    return { success: true };
  } catch (error) {
    console.log("Error in updateProfile", error);
    return { success: false, error: "Error updating profile" };
  }
}
