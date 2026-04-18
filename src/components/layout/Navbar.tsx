import Link from "next/link";
import React from "react";
import DesktopNavbar from "@/components/layout/DesktopNavbar";
import MobileNavbar from "@/components/layout/MobileNavbar";
import { getCurrentUserContext } from "@/actions/user.action";
import { getNotifications } from "@/actions/notification.action";
import { getChatUnreadCount } from "@/actions/chat.action";
import UserSearch from "@/components/search/UserSearch";
import LayoutChromeButtons from "@/components/layout/LayoutChromeButtons";

async function Navbar() {
  const context = await getCurrentUserContext();
  const profileHref = context?.profileHref ?? "/profile";
  const [{ notifications, unreadCount }, chatUnreadCount] = context
    ? await Promise.all([getNotifications(), getChatUnreadCount()])
    : [{ notifications: [], unreadCount: 0 }, 0];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background lg:hidden">
      <div className="mx-auto max-w-7xl">
        <div className="flex h-16 items-center gap-4 px-4">
          <div className="flex items-center gap-2">
            <LayoutChromeButtons initialUnreadCount={chatUnreadCount} />
            <Link
              href="/"
              className="bg-gradient-to-r from-sky-500 via-cyan-400 to-teal-400 bg-clip-text font-mono text-xl font-bold tracking-[0.28em] text-transparent"
            >
              Zmadora
            </Link>
          </div>

          <div className="hidden flex-1 md:block">
          </div>

          <DesktopNavbar
            isSignedIn={!!context}
            userId={context?.dbUser?.id}
            profileHref={profileHref}
            initialNotifications={notifications}
            unreadCount={unreadCount}
          />
          <MobileNavbar
            userId={context?.dbUser?.id}
            profileHref={profileHref}
            initialNotifications={notifications}
            unreadCount={unreadCount}
          />
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
