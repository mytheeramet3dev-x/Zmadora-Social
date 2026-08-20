import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { LayoutChromeProvider } from "@/components/layout/LayoutChromeContext";
import ChatRail from "@/components/chat/ChatRail";
import { CallProvider } from "@/components/chat/CallProvider";
import { Toaster } from "react-hot-toast";
import MobileAppShell from "@/components/layout/MobileAppShell";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Zmadora",
  description: "Glass-styled social app with posts, profiles, notifications, and chat.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} font-sans antialiased`}
      >
        <ClerkProvider
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
        >
          <CallProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
            <LayoutChromeProvider>
              <div className="relative min-h-screen">
                <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                  <div className="absolute inset-x-0 top-0 h-[500px] bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.15),transparent_80%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.25),transparent_80%)]" />
                  <div className="absolute left-[-10rem] top-40 h-[400px] w-[400px] rounded-full bg-indigo-500/10 blur-[100px] dark:bg-indigo-600/20" />
                  <div className="absolute bottom-0 right-[-10rem] h-[500px] w-[500px] rounded-full bg-fuchsia-500/10 blur-[120px] dark:bg-fuchsia-600/20" />
                </div>
                <Navbar />

                <main className="w-full relative z-10 pb-[calc(76px+env(safe-area-inset-bottom,0px))] md:pb-0">
                  <div className="mx-auto max-w-[1536px] px-2 sm:px-4 md:px-8">
                    <SidebarLayout sidebar={<Sidebar />} rightRail={<ChatRail />}>
                      {children}
                    </SidebarLayout>
                  </div>
                  <MobileAppShell />
                </main>
              </div>
            </LayoutChromeProvider>
            </ThemeProvider>
          </CallProvider>
        </ClerkProvider>
        <Toaster />
      </body>
    </html>
  );
}
