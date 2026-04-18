import { pusherServer } from "./pusher";

type ChatStreamPayload = {
  type: "chat_message";
  contact: {
    id: string;
    name: string | null;
    username: string;
    image: string | null;
  };
  message: {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    createdAt: string;
  };
};

export function publishChatEvent(userId: string, payload: ChatStreamPayload) {
  pusherServer.trigger(`user-${userId}`, "chat-event", payload).catch((error) => {
    console.error("Failed to publish chat event to Pusher:", error);
  });
}
