import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ConfigBanner } from "@/components/ConfigBanner";
import { OfflineBadge } from "@/components/OfflineBadge";

export const metadata: Metadata = {
  title: "AraTrack",
  description: "Real-time baby activity tracker for Aradhya",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-display">
        <ConfigBanner />
        <OfflineBadge />
        {children}
      </body>
    </html>
  );
}
