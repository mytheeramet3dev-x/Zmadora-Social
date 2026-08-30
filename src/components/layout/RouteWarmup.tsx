"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type RouteWarmupProps = {
  profileHref?: string;
};

export default function RouteWarmup({ profileHref }: RouteWarmupProps) {
  const router = useRouter();

  useEffect(() => {
    // Warm up the Next.js router cache for instant native-app like tab switching
    const routesToWarm = ["/", "/search", "/settings"];
    if (profileHref && profileHref !== "/profile") {
      routesToWarm.push(profileHref);
    }

    const prefetchRoutes = () => {
      routesToWarm.forEach((route) => {
        try {
          router.prefetch(route);
        } catch {
          // Ignore prefetch errors
        }
      });
    };

    if (typeof window !== "undefined") {
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(prefetchRoutes);
      } else {
        const timeout = setTimeout(prefetchRoutes, 300);
        return () => clearTimeout(timeout);
      }
    }
  }, [router, profileHref]);

  return null;
}
