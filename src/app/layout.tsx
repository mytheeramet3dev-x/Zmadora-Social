import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/layout/ThemeProvider";
import Navbar from "@/components/layout/Navbar";
import Sidebar from "@/components/layout/Sidebar";
import SidebarLayout from "@/components/layout/SidebarLayout";
import { LayoutChromeProvider } from "@/components/layout/LayoutChromeContext";
import ChatRail from "@/components/chat/ChatRail";
import { Toaster } from "react-hot-toast";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Zmadora",
  description: "Glass-styled social app with posts, profiles, notifications, and chat.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <LayoutChromeProvider>
              <div className="relative min-h-screen overflow-hidden">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.85),rgba(255,255,255,0))] dark:bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.12),rgba(0,0,0,0))]" />
                <div className="pointer-events-none absolute left-[-10rem] top-24 h-80 w-80 rounded-full bg-sky-200/30 blur-3xl dark:bg-sky-400/10" />
                <div className="pointer-events-none absolute bottom-0 right-[-8rem] h-72 w-72 rounded-full bg-teal-200/30 blur-3xl dark:bg-teal-400/10" />
                <Navbar />

                <main className="py-8">
                  <div className="mx-auto max-w-7xl px-4">
                    <SidebarLayout sidebar={<Sidebar />} rightRail={<ChatRail />}>
                      {children}
                    </SidebarLayout>
                  </div>
                </main>
              </div>
            </LayoutChromeProvider>
            <Toaster />
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
