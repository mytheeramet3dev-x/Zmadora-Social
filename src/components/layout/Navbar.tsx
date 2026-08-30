import Link from "next/link";
import React from "react";
import DesktopNavbar from "@/components/layout/DesktopNavbar";
import { getCurrentUserContext } from "@/actions/user.action";
import { getNotifications } from "@/actions/notification.action";
import { getChatUnreadCount } from "@/actions/chat.action";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/layout/ModeToggle";
import { SettingsIcon } from "lucide-react";
import RouteWarmup from "@/components/layout/RouteWarmup";

async function Navbar() {
  const context = await getCurrentUserContext();
  const profileHref = context?.profileHref ?? "/profile";
  const [{ notifications, unreadCount }, chatUnreadCount] = context
    ? await Promise.all([getNotifications(), getChatUnreadCount()])
    : [{ notifications: [], unreadCount: 0 }, 0];

  return (
    <>
      <RouteWarmup profileHref={profileHref} />
      <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md lg:hidden">
        <div className="mx-auto max-w-7xl">
          <div className="flex h-14 min-w-0 items-center justify-between gap-2 px-3 sm:px-4">
            <Link
              href="/"
              prefetch={true}
              className="min-w-0 truncate bg-gradient-to-r from-primary via-primary/90 to-primary/70 bg-clip-text font-mono text-lg font-bold tracking-[0.18em] text-transparent"
            >
              Zmadora
            </Link>

            <DesktopNavbar
              isSignedIn={!!context}
              userId={context?.dbUser?.id}
              profileHref={profileHref}
              initialNotifications={notifications}
              unreadCount={unreadCount}
            />

            <div className="flex md:hidden items-center gap-2">
              <ModeToggle />
              {context ? (
                <>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href="/settings" prefetch={true}>
                      <SettingsIcon className="h-5 w-5" />
                    </Link>
                  </Button>
                  <UserButton />
                </>
              ) : (
                <Button variant="default" size="sm" asChild>
                  <Link href="/sign-in" prefetch={true}>Sign-In</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}

export default Navbar;
