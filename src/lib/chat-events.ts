const encoder = new TextEncoder();
import { publishWebSocketChatEvent } from "@/lib/chat-ws-state";

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

type StreamController = {
  id: string;
  enqueue: (chunk: Uint8Array) => void;
};

const listeners = new Map<string, Map<string, StreamController>>();

function formatSseData(payload: ChatStreamPayload) {
  return encoder.encode(`event: chat\ndata: ${JSON.stringify(payload)}\n\n`);
}

export function subscribeToChatEvents(
  userId: string,
  controller: StreamController
) {
  const userListeners = listeners.get(userId) ?? new Map<string, StreamController>();
  userListeners.set(controller.id, controller);
  listeners.set(userId, userListeners);
}

export function unsubscribeFromChatEvents(userId: string, controllerId: string) {
  const userListeners = listeners.get(userId);
  if (!userListeners) return;

  userListeners.delete(controllerId);
  if (userListeners.size === 0) {
    listeners.delete(userId);
  }
}

export function publishChatEvent(userId: string, payload: ChatStreamPayload) {
  publishWebSocketChatEvent(userId, payload);

  const userListeners = listeners.get(userId);
  if (!userListeners?.size) return;

  const chunk = formatSseData(payload);
  for (const controller of userListeners.values()) {
    controller.enqueue(chunk);
  }
}

export function createHeartbeatChunk() {
  return encoder.encode(`event: heartbeat\ndata: ok\n\n`);
}
