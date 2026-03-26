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

function getDirectMessageDelegate(prisma: ReturnType<typeof getPrismaClient>) {
  return (prisma as ReturnType<typeof getPrismaClient> & {
    directMessage?: {
      findMany: (...args: unknown[]) => Promise<MessageWithUsers[] | MessageRow[]>;
      create: (...args: unknown[]) => Promise<MessageRow>;
      updateMany: (...args: unknown[]) => Promise<unknown>;
      count: (...args: unknown[]) => Promise<number>;
    };
  }).directMessage;
}

async function findMessagesForOverview(prisma: ReturnType<typeof getPrismaClient>, userId: string) {
  const directMessage = getDirectMessageDelegate(prisma);

  if (directMessage) {
    return (await directMessage.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
      include: {
        sender: {
          select: userPreviewSelect,
        },
        receiver: {
          select: userPreviewSelect,
        },
      },
    })) as MessageWithUsers[];
  }

  const rows = await prisma.$queryRaw<MessageWithUsers[]>(Prisma.sql`
    SELECT
      dm.id,
      dm."senderId",
      dm."receiverId",
      dm.content,
      dm."createdAt",
      dm."readAt",
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
    FROM "DirectMessage" dm
    JOIN "User" sender ON sender.id = dm."senderId"
    JOIN "User" receiver ON receiver.id = dm."receiverId"
    WHERE dm."senderId" = ${userId} OR dm."receiverId" = ${userId}
    ORDER BY dm."createdAt" DESC
    LIMIT 200
  `);

  return rows;
}

async function markConversationAsRead(
  prisma: ReturnType<typeof getPrismaClient>,
  senderId: string,
  receiverId: string
) {
  const directMessage = getDirectMessageDelegate(prisma);

  if (directMessage) {
    await directMessage.updateMany({
      where: {
        senderId,
        receiverId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
    return;
  }

  await prisma.$executeRaw(
    Prisma.sql`
      UPDATE "DirectMessage"
      SET "readAt" = NOW()
      WHERE "senderId" = ${senderId}
        AND "receiverId" = ${receiverId}
        AND "readAt" IS NULL
    `
  );
}

async function findConversationMessages(
  prisma: ReturnType<typeof getPrismaClient>,
  userId: string,
  otherUserId: string
) {
  const directMessage = getDirectMessageDelegate(prisma);

  if (directMessage) {
    return (await directMessage.findMany({
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
    })) as MessageRow[];
  }

  return prisma.$queryRaw<MessageRow[]>(Prisma.sql`
    SELECT id, "senderId", "receiverId", content, "createdAt", "readAt"
    FROM "DirectMessage"
    WHERE ("senderId" = ${userId} AND "receiverId" = ${otherUserId})
       OR ("senderId" = ${otherUserId} AND "receiverId" = ${userId})
    ORDER BY "createdAt" ASC
    LIMIT 100
  `);
}

async function createMessage(
  prisma: ReturnType<typeof getPrismaClient>,
  senderId: string,
  receiverId: string,
  content: string
) {
  const directMessage = getDirectMessageDelegate(prisma);

  if (directMessage) {
    return (await directMessage.create({
      data: {
        senderId,
        receiverId,
        content,
      },
    })) as MessageRow;
  }

  const rows = await prisma.$queryRaw<MessageRow[]>(Prisma.sql`
    INSERT INTO "DirectMessage" ("id", "senderId", "receiverId", "content", "createdAt", "updatedAt")
    VALUES (${crypto.randomUUID().replace(/-/g, "").slice(0, 25)}, ${senderId}, ${receiverId}, ${content}, NOW(), NOW())
    RETURNING id, "senderId", "receiverId", content, "createdAt", "readAt"
  `);

  return rows[0];
}

async function countUnreadMessages(prisma: ReturnType<typeof getPrismaClient>, userId: string) {
  const directMessage = getDirectMessageDelegate(prisma);

  if (directMessage) {
    return directMessage.count({
      where: {
        receiverId: userId,
        readAt: null,
      },
    });
  }

  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
    SELECT COUNT(*)::bigint AS count
    FROM "DirectMessage"
    WHERE "receiverId" = ${userId}
      AND "readAt" IS NULL
  `);

  return Number(rows[0]?.count ?? 0);
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
      const current = contactMap.get(otherUser.id);
      const unreadIncrement = message.receiverId === userId && !message.readAt ? 1 : 0;

      if (!current) {
        contactMap.set(otherUser.id, {
          id: otherUser.id,
          name: otherUser.name,
          username: otherUser.username,
          image: otherUser.image,
          lastMessage: message.content,
          lastMessageAt: toIso(message.createdAt),
          unreadCount: unreadIncrement,
        });
        continue;
      }

      if (unreadIncrement) {
        current.unreadCount += 1;
      }
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
      await markConversationAsRead(prisma, resolvedActiveContactId, userId);
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
