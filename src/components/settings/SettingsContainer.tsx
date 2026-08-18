"use client";

import { useState } from "react";
import { UserIcon, VideoIcon, PaletteIcon, ShieldIcon } from "lucide-react";
import ProfileSettings from "./ProfileSettings";
import DeviceSettings from "./DeviceSettings";
import AppearanceSettings from "./AppearanceSettings";
import AccountSettings from "./AccountSettings";

type SettingsContainerProps = {
  user: {
    id: string;
    name: string | null;
    username: string;
    bio: string | null;
    location: string | null;
    website: string | null;
    image: string | null;
  };
};

export default function SettingsContainer({ user }: SettingsContainerProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "devices" | "appearance" | "account">("profile");

  const tabs = [
    { id: "profile" as const, label: "Profile", icon: UserIcon },
    { id: "devices" as const, label: "Audio & Video", icon: VideoIcon },
    { id: "appearance" as const, label: "Appearance", icon: PaletteIcon },
    { id: "account" as const, label: "Account", icon: ShieldIcon },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your account preferences, hardware devices, and customization.
        </p>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-border pb-3 no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-all shrink-0 ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="rounded-3xl border border-border bg-card/40 p-6 sm:p-8 backdrop-blur-md shadow-sm">
        {activeTab === "profile" && <ProfileSettings user={user} />}
        {activeTab === "devices" && <DeviceSettings />}
        {activeTab === "appearance" && <AppearanceSettings />}
        {activeTab === "account" && <AccountSettings />}
      </div>
    </div>
  );
}
