import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ServiceWorkerRegister from "./ServiceWorkerRegister";
import ToastProvider from "@/components/ToastProvider";
import ToastBridge from "@/components/ToastBridge";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Purple Yam Inventory Management System",
  description: "Multi-branch inventory management system for Purple Yam",
  manifest: "/manifest.webmanifest",
  verification: {
    google: "ENNko8yFBwGxQAqjGYVX-cZPenwhhE04HQMLsMTMn2U",
  },
  icons: {
    icon: "/purple-yam-favicon.svg",
    shortcut: "/purple-yam-favicon.svg",
    apple: "/purple-yam-logo.jpg",
  },
  applicationName: "Purple Yam AIMS",
  appleWebApp: {
    capable: true,
    title: "Purple Yam AIMS",
    statusBarStyle: "default",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegister />
        <ToastProvider>
          <ToastBridge />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
