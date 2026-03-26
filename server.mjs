import { createServer } from "node:http";
import next from "next";
import { WebSocketServer } from "ws";
import {
  attachChatSocket,
  consumeChatSocketToken,
  detachChatSocket,
  publishWebSocketChatEvent,
} from "./src/lib/chat-ws-state.js";
import { sendChatMessageFromSocket } from "./src/lib/chat-ws-service.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number(process.env.PORT || 3000);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const handleUpgrade = app.getUpgradeHandler();

await app.prepare();

const server = createServer((req, res) => handle(req, res));
const wsServer = new WebSocketServer({ noServer: true });

server.on("upgrade", async (req, socket, head) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    if (url.pathname === "/api/chat/ws") {
      const token = url.searchParams.get("token");
      const userId = token ? consumeChatSocketToken(token) : null;

      if (!userId) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      wsServer.handleUpgrade(req, socket, head, (ws) => {
        attachChatSocket(userId, ws);

        ws.send(
          JSON.stringify({
            type: "connected",
            userId,
          })
        );

        ws.on("message", async (rawMessage) => {
          try {
            const payload = JSON.parse(rawMessage.toString());

            if (payload.type !== "send_message") {
              return;
            }

            const result = await sendChatMessageFromSocket(
              userId,
              payload.receiverId,
              payload.content
            );

            if (!result.success || !result.message || !result.sender || !result.receiver) {
              ws.send(
                JSON.stringify({
                  type: "message_error",
                  clientMessageId: payload.clientMessageId,
                  error: result.error || "Failed to send message",
                })
              );
              return;
            }

            ws.send(
              JSON.stringify({
                type: "message_sent",
                clientMessageId: payload.clientMessageId,
                contact: result.receiver,
                message: result.message,
              })
            );

            publishWebSocketChatEvent(result.receiver.id, {
              type: "chat_message",
              contact: result.sender,
              message: result.message,
            });
          } catch (error) {
            ws.send(
              JSON.stringify({
                type: "message_error",
                error: "Invalid socket payload",
              })
            );
            console.error("Invalid WebSocket payload:", error);
          }
        });

        ws.on("close", () => {
          detachChatSocket(userId, ws);
        });

        ws.on("error", () => {
          detachChatSocket(userId, ws);
        });
      });
      return;
    }

    await handleUpgrade(req, socket, head);
  } catch {
    socket.destroy();
  }
});

server.listen(port, hostname, () => {
  console.log(`> Ready on http://${hostname}:${port}`);
});
