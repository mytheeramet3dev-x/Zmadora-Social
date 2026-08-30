import { getCurrentUserContext } from "@/actions/user.action";
import SettingsContainer from "@/components/settings/SettingsContainer";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export const metadata = {
  title: "Settings - Zmadora",
  description: "Manage your account, profile, devices, and preferences on Zmadora.",
};

export default async function SettingsPage() {
  const context = await getCurrentUserContext();

  if (!context) {
    redirect("/");
  }

  return <SettingsContainer user={context.dbUser} />;
}
