import { getDbUserId } from "@/actions/user.action";
import {
  createNotificationHeartbeatChunk,
  subscribeToNotificationEvents,
  unsubscribeFromNotificationEvents,
} from "@/lib/notification-events";

export async function GET(request: Request) {
  const userId = await getDbUserId();

  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const controllerId = crypto.randomUUID();
      const heartbeat = setInterval(() => {
        controller.enqueue(createNotificationHeartbeatChunk());
      }, 15000);

      subscribeToNotificationEvents(userId, {
        id: controllerId,
        enqueue: (chunk) => controller.enqueue(chunk),
      });

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribeFromNotificationEvents(userId, controllerId);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
