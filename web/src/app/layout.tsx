import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { prisma } from "@repo/db";
import { hexToTriplet, resolveAccent } from "@/lib/accent";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Bot-Dashboard",
  description: "Konfiguration für den Discord-Bot",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Global eingestellte Akzentfarbe (Dashboard → Zahnrad neben dem Profil).
  // Fällt ohne Config-Zeile oder bei ungültigen Werten auf Violet → Pink zurück.
  const config = await prisma.config
    .findUnique({
      where: { id: 1 },
      select: { accentFrom: true, accentTo: true },
    })
    .catch(() => null);
  const accent = resolveAccent(config?.accentFrom, config?.accentTo);

  return (
    <html
      lang="de"
      className={`${inter.variable} dark`}
      style={
        {
          "--accent-from": hexToTriplet(accent.from),
          "--accent-to": hexToTriplet(accent.to),
        } as React.CSSProperties
      }
    >
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
