import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpotifyProvider } from "@/context/SpotifyContext";
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
  title: "Now Playing",
  description: "View your current Spotify playback with a spinning vinyl disc visualization",
  keywords: ["spotify", "music", "now playing", "vinyl", "playback"],
  authors: [{ name: "Your Name" }],
  openGraph: {
    title: "Now Playing",
    description: "View your current Spotify playback with a spinning vinyl disc visualization",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Now Playing",
    description: "View your current Spotify playback with a spinning vinyl disc visualization",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <SpotifyProvider>{children}</SpotifyProvider>
      </body>
    </html>
  );
}
