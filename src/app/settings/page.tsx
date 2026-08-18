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

  const dbUser = await prisma.user.findUnique({
    where: { id: context.dbUser.id },
    select: {
      id: true,
      name: true,
      username: true,
      bio: true,
      location: true,
      website: true,
      image: true,
    },
  });

  if (!dbUser) {
    redirect("/");
  }

  return <SettingsContainer user={dbUser} />;
}
