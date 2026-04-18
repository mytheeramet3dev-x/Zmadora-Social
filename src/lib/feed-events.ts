import { pusherServer } from "./pusher";

type FeedEventPayload =
  | {
      type: "post_created" | "post_updated";
      post: unknown;
    }
  | {
      type: "post_deleted";
      postId: string;
    };

export function publishFeedEvent(payload: FeedEventPayload) {
  // Fire and forget, catch errors to avoid crashing the server action
  pusherServer.trigger("feed-channel", "feed-event", payload).catch((error) => {
    console.error("Failed to publish feed event to Pusher:", error);
  });
}
