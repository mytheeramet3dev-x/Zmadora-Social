import PusherLib from "pusher-js";

// Handle CJS/ESM interop: pusher-js may export as { default: Pusher } or as Pusher directly
// depending on the bundler/runtime. This normalises both cases.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PusherConstructor: typeof PusherLib = (PusherLib as any).default ?? PusherLib;

// Guard against SSR — pusher-js is a browser-only library.
// All callers use pusherClient inside useEffect, so this null is never accessed on the server.
export const pusherClient: PusherLib =
  typeof window !== "undefined"
    ? new PusherConstructor(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
        cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      })
    : (null as unknown as PusherLib);
