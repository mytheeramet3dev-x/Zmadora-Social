import PusherClient from "pusher-js";

// Module-level singleton — correct pattern for browser clients.
// globalThis is a server-side pattern and does NOT work reliably in Next.js Client Components.
export const pusherClient = new PusherClient(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  {
    cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
  }
);
