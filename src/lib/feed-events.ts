const encoder = new TextEncoder();

type FeedEventPayload =
  | {
      type: "post_created" | "post_updated";
      post: unknown;
    }
  | {
      type: "post_deleted";
      postId: string;
    };

type StreamController = {
  id: string;
  enqueue: (chunk: Uint8Array) => void;
};

const listeners = new Map<string, StreamController>();

function formatSseData(payload: FeedEventPayload) {
  return encoder.encode(`event: feed\ndata: ${JSON.stringify(payload)}\n\n`);
}

export function subscribeToFeedEvents(controller: StreamController) {
  listeners.set(controller.id, controller);
}

export function unsubscribeFromFeedEvents(controllerId: string) {
  listeners.delete(controllerId);
}

export function publishFeedEvent(payload: FeedEventPayload) {
  const chunk = formatSseData(payload);
  for (const controller of listeners.values()) {
    controller.enqueue(chunk);
  }
}

export function createHeartbeatChunk() {
  return encoder.encode(`event: heartbeat\ndata: ok\n\n`);
}
