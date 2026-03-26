import {
  createHeartbeatChunk,
  subscribeToFeedEvents,
  unsubscribeFromFeedEvents,
} from "@/lib/feed-events";

export async function GET(request: Request) {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const controllerId = crypto.randomUUID();
      const heartbeat = setInterval(() => {
        controller.enqueue(createHeartbeatChunk());
      }, 15000);

      subscribeToFeedEvents({
        id: controllerId,
        enqueue: (chunk) => controller.enqueue(chunk),
      });

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribeFromFeedEvents(controllerId);
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
