import { pusherServer } from "./pusher";

type NotificationStreamPayload =
  | {
      type: "notifications_changed";
    }
  | {
      type: "notifications_read";
    };

export function publishNotificationEvent(
  userId: string,
  payload: NotificationStreamPayload
) {
  pusherServer.trigger(`user-${userId}`, "notification-event", payload).catch((error) => {
    console.error("Failed to publish notification event to Pusher:", error);
  });
}
