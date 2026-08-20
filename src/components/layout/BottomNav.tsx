"use client";

import Link from "next/link";
import { HomeIcon, SearchIcon, BellIcon, UserIcon, MessageCircleIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLayoutChrome } from "@/components/layout/LayoutChromeContext";

type BottomNavProps = {
  profileHref: string;
  unreadNotifications: number;
  unreadMessages: number;
};

export default function BottomNav({ profileHref, unreadNotifications, unreadMessages }: BottomNavProps) {
  const pathname = usePathname();
  const { toggleChat, isChatOpen } = useLayoutChrome();

  const navItems = [
    { href: "/", icon: HomeIcon, label: "Home" },
    { href: "/search", icon: SearchIcon, label: "Search" },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-xl border-t border-border flex items-center justify-around h-[60px] pb-safe">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
            pathname === item.href ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <item.icon className={`w-6 h-6 ${pathname === item.href ? "fill-current" : ""}`} />
        </Link>
      ))}

      {/* Notifications */}
      <Link
        href="/notifications"
        className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 ${
          pathname === "/notifications" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <div className="relative">
          <BellIcon className={`w-6 h-6 ${pathname === "/notifications" ? "fill-current" : ""}`} />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-semibold text-white">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </span>
          )}
        </div>
      </Link>

      {/* Messages */}
      <button
        onClick={toggleChat}
        className={`relative flex flex-col items-center justify-center w-full h-full space-y-1 ${
          isChatOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <div className="relative">
          <MessageCircleIcon className={`w-6 h-6 ${isChatOpen ? "fill-current" : ""}`} />
          {unreadMessages > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-semibold text-white">
              {unreadMessages > 9 ? "9+" : unreadMessages}
            </span>
          )}
        </div>
      </button>

      {/* Profile */}
      <Link
        href={profileHref}
        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
          pathname === profileHref ? "text-foreground" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <UserIcon className={`w-6 h-6 ${pathname === profileHref ? "fill-current" : ""}`} />
      </Link>
    </div>
  );
}
