"use client";

import Link from "next/link";
import { HomeIcon, SearchIcon, UserIcon, MessageCircleIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLayoutChrome } from "@/components/layout/LayoutChromeContext";
import NotificationBell, { type NotificationItem } from "@/components/notifications/NotificationBell";

type BottomNavProps = {
  userId: string;
  profileHref: string;
  initialNotifications: NotificationItem[];
  unreadNotifications: number;
  unreadMessages: number;
};

export default function BottomNav({
  userId,
  profileHref,
  initialNotifications,
  unreadNotifications,
  unreadMessages,
}: BottomNavProps) {
  const pathname = usePathname();
  const { toggleChat, isChatOpen } = useLayoutChrome();

  const navItems = [
    { href: "/", icon: HomeIcon, label: "Home" },
    { href: "/search", icon: SearchIcon, label: "Search" },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/85 backdrop-blur-md border-t border-border flex items-center justify-around h-16 pb-[env(safe-area-inset-bottom,0px)]">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            className={`flex flex-col items-center justify-center w-full h-full min-h-[44px] transition-colors ${
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : "stroke-2"}`} />
          </Link>
        );
      })}

      {/* Notifications */}
      <div className="flex h-full w-full items-center justify-center">
        <NotificationBell
          userId={userId}
          initialNotifications={initialNotifications}
          initialUnreadCount={unreadNotifications}
          showLabel={false}
          iconClassName="h-5 w-5"
          className="h-full w-full justify-center rounded-none text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        />
      </div>

      {/* Messages */}
      <button
        type="button"
        onClick={toggleChat}
        aria-label={isChatOpen ? "Close messages" : "Open messages"}
        className={`relative flex flex-col items-center justify-center w-full h-full min-h-[44px] transition-colors ${
          isChatOpen ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <div className="relative">
          <MessageCircleIcon className={`w-5 h-5 ${isChatOpen ? "stroke-[2.5]" : "stroke-2"}`} />
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
              {unreadMessages > 9 ? "9+" : unreadMessages}
            </span>
          )}
        </div>
      </button>

      {/* Profile */}
      {(() => {
        const isProfileActive = pathname === profileHref;
        return (
          <Link
            href={profileHref}
            aria-label="Profile"
            className={`flex flex-col items-center justify-center w-full h-full min-h-[44px] transition-colors ${
              isProfileActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <UserIcon className={`w-5 h-5 ${isProfileActive ? "stroke-[2.5]" : "stroke-2"}`} />
          </Link>
        );
      })()}
    </div>
  );
}
