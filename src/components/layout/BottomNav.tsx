"use client";

import Link from "next/link";
import { HomeIcon, SearchIcon, UserIcon, SettingsIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import NotificationBell, { type NotificationItem } from "@/components/notifications/NotificationBell";

type BottomNavProps = {
  userId: string;
  profileHref: string;
  initialNotifications: NotificationItem[];
  unreadNotifications: number;
};

export default function BottomNav({
  userId,
  profileHref,
  initialNotifications,
  unreadNotifications,
}: BottomNavProps) {
  const pathname = usePathname();

  const handleHomeClick = (e: React.MouseEvent) => {
    if (pathname === "/") {
      e.preventDefault();
      if (window.scrollY > 150) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        window.dispatchEvent(new CustomEvent("social:refresh-feed"));
      }
    }
  };

  const navItems = [
    { href: "/", icon: HomeIcon, label: "Home", onClick: handleHomeClick },
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
            prefetch={true}
            onClick={item.onClick}
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

      {/* Settings */}
      {(() => {
        const isSettingsActive = pathname === "/settings";
        return (
          <Link
            href="/settings"
            prefetch={true}
            aria-label="Settings"
            className={`flex flex-col items-center justify-center w-full h-full min-h-[44px] transition-colors ${
              isSettingsActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <SettingsIcon className={`w-5 h-5 ${isSettingsActive ? "stroke-[2.5]" : "stroke-2"}`} />
          </Link>
        );
      })()}

      {/* Profile */}
      {(() => {
        const isProfileActive = pathname === profileHref;
        return (
          <Link
            href={profileHref}
            prefetch={true}
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
