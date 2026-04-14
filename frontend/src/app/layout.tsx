import type { Metadata } from "next";
import { Oswald, JetBrains_Mono } from "next/font/google";
import { ParticleBackground } from "@/components/ParticleBackground";
import { CursorStalker } from "@/components/CursorStalker";
import "./globals.css";

const oswald = Oswald({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "HinH - Hackathon in Hackathon",
  description: "AI-driven hackathon simulation platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${oswald.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body
        className="min-h-full flex flex-col"
        style={{ background: 'var(--tk-bg)', color: '#fff' }}
      >
        {/* Tekken 8 cursor stalker — soft-light glow following mouse */}
        <div id="stalker" />
        <CursorStalker />
        {/* Floating particle canvas */}
        <ParticleBackground />
        {/* CRT scanline overlay */}
        <div className="scanline" />
        {children}
      </body>
    </html>
  );
}
