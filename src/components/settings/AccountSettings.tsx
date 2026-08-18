"use client";

import { useClerk, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { ShieldCheckIcon, KeyRoundIcon, MailIcon, SmartphoneIcon, ExternalLinkIcon } from "lucide-react";

export default function AccountSettings() {
  const { openUserProfile } = useClerk();
  const { user } = useUser();

  const primaryEmail = user?.primaryEmailAddress?.emailAddress || "Not available";
  const is2FAEnabled = user?.twoFactorEnabled;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Account & Security</h3>
        <p className="text-xs text-muted-foreground">
          Manage your login credentials, multi-factor authentication, and connected accounts.
        </p>
      </div>

      <div className="space-y-4">
        {/* Account Details Box */}
        <div className="rounded-2xl border border-border bg-card/30 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500/15 text-sky-500">
                <MailIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Primary Email
                </p>
                <p className="text-sm font-medium text-foreground">{primaryEmail}</p>
              </div>
            </div>
          </div>

          <div className="border-t border-border/60 pt-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-500">
                <ShieldCheckIcon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Two-Factor Authentication (2FA)
                </p>
                <p className="text-sm font-medium text-foreground">
                  {is2FAEnabled ? "Enabled" : "Disabled (Recommended to enable)"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Security Management Action */}
        <div className="rounded-2xl border border-border bg-gradient-to-r from-sky-500/10 via-cyan-500/5 to-teal-500/10 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <KeyRoundIcon className="h-4 w-4 text-sky-500" />
              <h4 className="text-sm font-semibold">Clerk Security Dashboard</h4>
            </div>
            <p className="text-xs text-muted-foreground max-w-md">
              Update password, manage active browser sessions, setup hardware security keys, or disconnect third-party accounts.
            </p>
          </div>
          <Button
            onClick={() => openUserProfile()}
            className="rounded-full gap-2 text-xs shrink-0"
          >
            Manage Security
            <ExternalLinkIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
