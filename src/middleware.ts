import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware({
  proxyUrl: process.env.NEXT_PUBLIC_CLERK_PROXY_URL || "https://zmadora-social-w.vercel.app/__clerk",
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Required for Clerk auto-proxy on vercel.app
    "/__clerk/:path*",
  ],
};
