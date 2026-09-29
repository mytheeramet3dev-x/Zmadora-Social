"use server";

import prisma from "@/lib/prisma";
import { publishNotificationEvent } from "@/lib/notification-events";
import { getDbUserId } from "./user.action";

const DEFAULT_NOTIFICATION_LIMIT = 8;
const MAX_NOTIFICATION_LIMIT = 50;

function normalizeNotificationLimit(limit: number) {
  if (!Number.isFinite(limit)) return DEFAULT_NOTIFICATION_LIMIT;
  return Math.min(MAX_NOTIFICATION_LIMIT, Math.max(1, Math.trunc(limit)));
}

export async function getNotifications(limit = DEFAULT_NOTIFICATION_LIMIT) {
  try {
    const userId = await getDbUserId();
    if (!userId) {
      return { notifications: [], unreadCount: 0 };
    }

    const safeLimit = normalizeNotificationLimit(limit);

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: safeLimit,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
          post: {
            select: {
              id: true,
              content: true,
              image: true,
            },
          },
          comment: {
            select: {
              id: true,
              content: true,
            },
          },
          message: {
            select: {
              id: true,
              content: true,
            },
          },
        },
      }),
      prisma.notification.count({
        where: {
          userId,
          read: false,
        },
      }),
    ]);

    return { notifications, unreadCount };
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return { notifications: [], unreadCount: 0 };
  }
}

export async function markAllNotificationsAsRead() {
  try {
    const userId = await getDbUserId();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    await prisma.notification.updateMany({
      where: {
        userId,
        read: false,
      },
      data: {
        read: true,
      },
    });

    publishNotificationEvent(userId, {
      type: "notifications_read",
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to mark notifications as read:", error);
    return { success: false, error: "Failed to update notifications" };
  }
}
