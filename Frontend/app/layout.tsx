import type { Metadata } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

// Display face — logotype, hero and page titles only.
//
// PRD §2 specifies Bricolage Grotesque; this is a deliberate swap. Bricolage's
// wide, quirky forms got noisy at 48–68px next to Geist. Space Grotesk keeps
// the geometric grotesque character but stays clean at display sizes.
const display = Space_Grotesk({
  variable: "--font-display-face",
  subsets: ["latin"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Counter — Order from any shop. Watch it move.",
  description:
    "Browse local stores, place an order, and follow it from placed to ready.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Paper is the default skin. The owner and admin consoles set data-skin="ink"
  // on their own layout — the two are never mixed on one screen.
  return (
    <html lang="en" data-skin="paper">
      <body
        className={`${display.variable} ${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
