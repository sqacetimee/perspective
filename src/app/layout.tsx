// src/app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#07080B",
};

export const metadata: Metadata = {
  title: {
    default: "Perspective.ai",
    template: "%s • Perspective.ai",
  },
  description: "Two perspectives, one synthesis.",
  applicationName: "Perspective.ai",
  openGraph: {
    title: "Perspective.ai",
    description: "Two perspectives, one synthesis.",
    siteName: "Perspective.ai",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-[#07080B]">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#07080B] text-zinc-100`}
      >
        {children}
      </body>
    </html>
  );
}
