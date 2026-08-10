import type { Metadata } from "next";
import { Space_Grotesk, Inter, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

// Tres roles tipográficos deliberados: display técnico para títulos,
// una sans neutra para texto de apoyo, y una monoespaciada para las
// lecturas — que se vean como un instrumento digital, no como prosa.
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700"],
});
const body = Inter({ subsets: ["latin"], variable: "--font-body" });
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "OceanView — Monitoreo oceanográfico en tiempo real",
  description:
    "Datos reales de boyas de NOAA NDBC: oleaje, viento y temperatura del mar.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${body.variable} ${mono.variable}`}
    >
      <body className="min-h-screen bg-abyss font-body text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
