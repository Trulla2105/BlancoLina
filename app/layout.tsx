import type { Metadata, Viewport } from "next";
import { Arimo, DM_Sans, Jost } from "next/font/google";
import { SITE } from "@/lib/site";
import "./globals.css";
import "./admin.css";

const arimo = Arimo({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-body" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-head" });
const jost = Jost({ subsets: ["latin"], weight: ["300", "400"], variable: "--font-logo" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: `${SITE.nombre} | ${SITE.bajada}`,
    template: `%s | ${SITE.nombre}`,
  },
  description: SITE.descripcion,
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: SITE.nombre,
    title: `${SITE.nombre} | ${SITE.bajada}`,
    description: SITE.descripcion,
    images: ["/seed/banners/hero-1-desktop.webp"],
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es-AR" className={`${arimo.variable} ${dmSans.variable} ${jost.variable}`}>
      <body>{children}</body>
    </html>
  );
}
