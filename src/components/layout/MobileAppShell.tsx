import { getCurrentUserContext } from "@/actions/user.action";
import { getNotifications } from "@/actions/notification.action";
import { getChatUnreadCount } from "@/actions/chat.action";
import BottomNav from "@/components/layout/BottomNav";
import MobilePostFAB from "@/components/feed/MobilePostFAB";

export default async function MobileAppShell() {
  const context = await getCurrentUserContext();
  
  if (!context) return null; // Guests don't need the BottomNav (or maybe they do? but X doesn't really let you do much without logging in)

  const profileHref = context.profileHref;
  const [{ unreadCount: unreadNotifications }, unreadMessages] = await Promise.all([
    getNotifications(),
    getChatUnreadCount(),
  ]);

  return (
    <>
      <MobilePostFAB userImage={context.dbUser.image} />
      <BottomNav 
        profileHref={profileHref} 
        unreadNotifications={unreadNotifications} 
        unreadMessages={unreadMessages} 
      />
    </>
  );
}
