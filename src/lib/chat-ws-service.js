import { Pool } from "pg";
import { randomUUID } from "node:crypto";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const pool = globalThis.__socialChatWsPool ?? new Pool({
  connectionString,
});

globalThis.__socialChatWsPool = pool;

function normalizeMessageRow(row) {
  return {
    id: row.id,
    senderId: row.senderId,
    receiverId: row.receiverId,
    content: row.content,
    createdAt: new Date(row.createdAt).toISOString(),
  };
}

export async function sendChatMessageFromSocket(senderId, receiverId, content) {
  if (!senderId) {
    return { success: false, error: "Unauthorized" };
  }

  if (senderId === receiverId) {
    return { success: false, error: "You cannot message yourself" };
  }

  const normalizedContent = (content || "").trim();
  if (!normalizedContent) {
    return { success: false, error: "Message cannot be empty" };
  }

  const client = await pool.connect();

  try {
    const userResult = await client.query(
      `
        SELECT id, name, username, image
        FROM "User"
        WHERE id = ANY($1::text[])
      `,
      [[senderId, receiverId]]
    );

    const sender = userResult.rows.find((row) => row.id === senderId) || null;
    const receiver = userResult.rows.find((row) => row.id === receiverId) || null;

    if (!sender) {
      return { success: false, error: "Sender not found" };
    }

    if (!receiver) {
      return { success: false, error: "Recipient not found" };
    }

    await client.query("BEGIN");

    const messageId = randomUUID();
    const notificationId = randomUUID();

    const messageResult = await client.query(
      `
        INSERT INTO "DirectMessage" (
          id,
          "senderId",
          "receiverId",
          content,
          "createdAt",
          "updatedAt"
        )
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, "senderId", "receiverId", content, "createdAt"
      `,
      [messageId, senderId, receiverId, normalizedContent]
    );

    await client.query(
      `
        INSERT INTO "Notification" (
          id,
          "userId",
          "creatorId",
          type,
          "messageId",
          read,
          "createdAt"
        )
        VALUES ($1, $2, $3, 'MESSAGE', $4, false, NOW())
      `,
      [notificationId, receiverId, senderId, messageId]
    );

    await client.query("COMMIT");

    return {
      success: true,
      sender: {
        id: sender.id,
        name: sender.name,
        username: sender.username,
        image: sender.image,
      },
      receiver: {
        id: receiver.id,
        name: receiver.name,
        username: receiver.username,
        image: receiver.image,
      },
      message: normalizeMessageRow(messageResult.rows[0]),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Failed to send WebSocket message:", error);
    return { success: false, error: "Failed to send message" };
  } finally {
    client.release();
  }
}
