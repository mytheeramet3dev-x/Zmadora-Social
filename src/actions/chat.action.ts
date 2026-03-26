"use server";

import { Prisma } from "@prisma/client";
import { getPrismaClient } from "@/lib/prisma";
import { publishChatEvent } from "@/lib/chat-events";
import { publishNotificationEvent } from "@/lib/notification-events";
import { getDbUserId, getRandomUsers } from "./user.action";

const userPreviewSelect = {
  id: true,
  name: true,
  username: true,
  image: true,
} as const;

function toIso(value: Date) {
  return new Date(value).toISOString();
}

type MessageWithUsers = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: Date;
  readAt: Date | null;
  sender: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
  };
  receiver: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
  };
};

type MessageRow = {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: Date;
  readAt: Date | null;
};

type ConversationOverviewRow = MessageWithUsers & {
  contactId: string;
  unreadCount: number;
};

async function findMessagesForOverview(prisma: ReturnType<typeof getPrismaClient>, userId: string) {
  return prisma.$queryRaw<ConversationOverviewRow[]>(Prisma.sql`
    WITH ranked_messages AS (
      SELECT
        dm.id,
        dm."senderId",
        dm."receiverId",
        dm.content,
        dm."createdAt",
        dm."readAt",
        CASE
          WHEN dm."senderId" = ${userId} THEN dm."receiverId"
          ELSE dm."senderId"
        END AS "contactId",
        SUM(
          CASE
            WHEN dm."receiverId" = ${userId} AND dm."readAt" IS NULL THEN 1
            ELSE 0
          END
        ) OVER (
          PARTITION BY CASE
            WHEN dm."senderId" = ${userId} THEN dm."receiverId"
            ELSE dm."senderId"
          END
        )::int AS "unreadCount",
        ROW_NUMBER() OVER (
          PARTITION BY CASE
            WHEN dm."senderId" = ${userId} THEN dm."receiverId"
            ELSE dm."senderId"
          END
          ORDER BY dm."createdAt" DESC
        ) AS rn
      FROM "DirectMessage" dm
      WHERE dm."senderId" = ${userId} OR dm."receiverId" = ${userId}
    )
    SELECT
      ranked_messages.id,
      ranked_messages."senderId",
      ranked_messages."receiverId",
      ranked_messages.content,
      ranked_messages."createdAt",
      ranked_messages."readAt",
      ranked_messages."contactId",
      ranked_messages."unreadCount",
      json_build_object(
        'id', sender.id,
        'name', sender.name,
        'username', sender.username,
        'image', sender.image
      ) AS sender,
      json_build_object(
        'id', receiver.id,
        'name', receiver.name,
        'username', receiver.username,
        'image', receiver.image
      ) AS receiver
    FROM ranked_messages
    JOIN "User" sender ON sender.id = ranked_messages."senderId"
    JOIN "User" receiver ON receiver.id = ranked_messages."receiverId"
    WHERE ranked_messages.rn = 1
    ORDER BY ranked_messages."createdAt" DESC
  `);
}

async function markConversationMessagesAsRead(
  prisma: ReturnType<typeof getPrismaClient>,
  fromUserId: string,
  toUserId: string
) {
  await prisma.directMessage.updateMany({
    where: {
      senderId: fromUserId,
      receiverId: toUserId,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });
}

async function findConversationMessages(
  prisma: ReturnType<typeof getPrismaClient>,
  userId: string,
  otherUserId: string
) {
  return prisma.directMessage.findMany({
    where: {
      OR: [
        {
          senderId: userId,
          receiverId: otherUserId,
        },
        {
          senderId: otherUserId,
          receiverId: userId,
        },
      ],
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 100,
  });
}

async function createMessage(
  prisma: ReturnType<typeof getPrismaClient>,
  senderId: string,
  receiverId: string,
  content: string
) {
  return prisma.directMessage.create({
    data: {
      senderId,
      receiverId,
      content,
    },
  });
}

async function countUnreadMessages(prisma: ReturnType<typeof getPrismaClient>, userId: string) {
  return prisma.directMessage.count({
    where: {
      receiverId: userId,
      readAt: null,
    },
  });
}

export async function getChatState(activeContactId?: string | null) {
  try {
    const prisma = getPrismaClient();
    const userId = await getDbUserId();

    if (!userId) {
      return {
        viewerUserId: null,
        contacts: [],
        activeContactId: null,
        messages: [],
      };
    }

    const [directMessages, suggestedContacts, activeContactUser] = await Promise.all([
      findMessagesForOverview(prisma, userId),
      getRandomUsers(),
      activeContactId
        ? prisma.user.findUnique({
            where: {
              id: activeContactId,
            },
            select: userPreviewSelect,
          })
        : Promise.resolve(null),
    ]);

    const contactMap = new Map<
      string,
      {
        id: string;
        name: string | null;
        username: string;
        image: string | null;
        lastMessage: string | null;
        lastMessageAt: string | null;
        unreadCount: number;
      }
    >();

    for (const message of directMessages) {
      const otherUser = message.senderId === userId ? message.receiver : message.sender;

      contactMap.set(otherUser.id, {
        id: otherUser.id,
        name: otherUser.name,
        username: otherUser.username,
        image: otherUser.image,
        lastMessage: message.content,
        lastMessageAt: toIso(message.createdAt),
        unreadCount: message.unreadCount,
      });
    }

    for (const suggested of suggestedContacts) {
      if (!contactMap.has(suggested.id)) {
        contactMap.set(suggested.id, {
          id: suggested.id,
          name: suggested.name,
          username: suggested.username,
          image: suggested.image,
          lastMessage: null,
          lastMessageAt: null,
          unreadCount: 0,
        });
      }
    }

    if (
      activeContactUser &&
      activeContactUser.id !== userId &&
      !contactMap.has(activeContactUser.id)
    ) {
      contactMap.set(activeContactUser.id, {
        id: activeContactUser.id,
        name: activeContactUser.name,
        username: activeContactUser.username,
        image: activeContactUser.image,
        lastMessage: null,
        lastMessageAt: null,
        unreadCount: 0,
      });
    }

    const contacts = Array.from(contactMap.values()).sort((left, right) => {
      const leftTime = left.lastMessageAt ? new Date(left.lastMessageAt).getTime() : 0;
      const rightTime = right.lastMessageAt ? new Date(right.lastMessageAt).getTime() : 0;

      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return (left.name || left.username).localeCompare(right.name || right.username);
    });

    const resolvedActiveContactId =
      activeContactId && contacts.some((contact) => contact.id === activeContactId)
        ? activeContactId
        : contacts[0]?.id ?? null;

    if (resolvedActiveContactId) {
      await markConversationMessagesAsRead(prisma, resolvedActiveContactId, userId);
    }

    const messages = resolvedActiveContactId
      ? await findConversationMessages(prisma, userId, resolvedActiveContactId)
      : [];

    return {
      viewerUserId: userId,
      contacts: contacts.map((contact) =>
        contact.id === resolvedActiveContactId
          ? { ...contact, unreadCount: 0 }
          : contact
      ),
      activeContactId: resolvedActiveContactId,
      messages: messages.map((message) => ({
        id: message.id,
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        createdAt: toIso(message.createdAt),
      })),
    };
  } catch (error) {
    console.error("Failed to get chat state:", error);
    return {
      viewerUserId: null,
      contacts: [],
      activeContactId: null,
      messages: [],
    };
  }
}

export async function sendDirectMessage(receiverId: string, content: string) {
  try {
    const prisma = getPrismaClient();
    const senderId = await getDbUserId();

    if (!senderId) {
      return { success: false, error: "Sign in required" };
    }

    if (senderId === receiverId) {
      return { success: false, error: "You cannot message yourself" };
    }

    const normalizedContent = content.trim();
    if (!normalizedContent) {
      return { success: false, error: "Message cannot be empty" };
    }

    const [receiver, sender] = await Promise.all([
      prisma.user.findUnique({
        where: { id: receiverId },
        select: userPreviewSelect,
      }),
      prisma.user.findUnique({
        where: { id: senderId },
        select: userPreviewSelect,
      }),
    ]);

    if (!receiver) {
      return { success: false, error: "Recipient not found" };
    }

    if (!sender) {
      return { success: false, error: "Sender not found" };
    }

    const [message] = await prisma.$transaction(async (tx) => {
      const createdMessage = await createMessage(
        tx as ReturnType<typeof getPrismaClient>,
        senderId,
        receiverId,
        normalizedContent
      );

      await tx.notification.create({
        data: {
          type: "MESSAGE",
          userId: receiverId,
          creatorId: senderId,
          messageId: createdMessage.id,
        },
      });

      return [createdMessage];
    });

    const normalizedMessage = {
      id: message.id,
      senderId: message.senderId,
      receiverId: message.receiverId,
      content: message.content,
      createdAt: toIso(message.createdAt),
    };

    publishChatEvent(receiverId, {
      type: "chat_message",
      contact: sender,
      message: normalizedMessage,
    });

    publishNotificationEvent(receiverId, {
      type: "notifications_changed",
    });

    publishChatEvent(senderId, {
      type: "chat_message",
      contact: receiver,
      message: normalizedMessage,
    });

    return {
      success: true,
      message: normalizedMessage,
    };
  } catch (error) {
    console.error("Failed to send direct message:", error);
    return { success: false, error: "Failed to send message" };
  }
}

export async function getChatUnreadCount() {
  try {
    const prisma = getPrismaClient();
    const userId = await getDbUserId();

    if (!userId) {
      return 0;
    }

    return countUnreadMessages(prisma, userId);
  } catch (error) {
    console.error("Failed to get chat unread count:", error);
    return 0;
  }
}
