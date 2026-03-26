const encoder = new TextEncoder();

type NotificationStreamPayload =
  | {
      type: "notifications_changed";
    }
  | {
      type: "notifications_read";
    };

type StreamController = {
  id: string;
  enqueue: (chunk: Uint8Array) => void;
};

const listeners = new Map<string, Map<string, StreamController>>();

function formatSseData(payload: NotificationStreamPayload) {
  return encoder.encode(`event: notification\ndata: ${JSON.stringify(payload)}\n\n`);
}

export function subscribeToNotificationEvents(
  userId: string,
  controller: StreamController
) {
  const userListeners = listeners.get(userId) ?? new Map<string, StreamController>();
  userListeners.set(controller.id, controller);
  listeners.set(userId, userListeners);
}

export function unsubscribeFromNotificationEvents(
  userId: string,
  controllerId: string
) {
  const userListeners = listeners.get(userId);
  if (!userListeners) return;

  userListeners.delete(controllerId);
  if (userListeners.size === 0) {
    listeners.delete(userId);
  }
}

export function publishNotificationEvent(
  userId: string,
  payload: NotificationStreamPayload
) {
  const userListeners = listeners.get(userId);
  if (!userListeners?.size) return;

  const chunk = formatSseData(payload);
  for (const controller of userListeners.values()) {
    controller.enqueue(chunk);
  }
}

export function createNotificationHeartbeatChunk() {
  return encoder.encode(`event: heartbeat\ndata: ok\n\n`);
}
