import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: {
    default: "Foxity",
    template: "%s - Foxity",
  },
  description: "AI 能动性驱动的团队能力测评产品",
  icons: {
    icon: "/fox.png",
    shortcut: "/fox.png",
    apple: "/fox.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-fox-cream text-fox-navy antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
