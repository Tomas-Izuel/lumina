import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lumina.propital.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Lumina — Recorridos virtuales con IA",
    template: "%s · Lumina",
  },
  description:
    "Lumina convierte las fotos de una propiedad en un recorrido virtual cinematográfico, generado con IA (Amazon Bedrock · Luma Ray 2). Automático, multi-tenant y por API.",
  applicationName: "Lumina",
  keywords: [
    "recorrido virtual",
    "tour virtual inmobiliario",
    "video con IA",
    "real estate video",
    "Amazon Bedrock",
    "Luma Ray 2",
    "IA generativa",
    "Propital",
    "inmobiliaria",
  ],
  authors: [{ name: "Propital" }],
  creator: "Propital",
  publisher: "Propital",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITE_URL,
    siteName: "Lumina",
    title: "Lumina — Recorridos virtuales con IA",
    description:
      "De las fotos de una propiedad a un recorrido virtual cinematográfico, en minutos. Impulsado por IA generativa.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumina — Recorridos virtuales con IA",
    description:
      "De las fotos de una propiedad a un recorrido virtual cinematográfico, en minutos.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "technology",
};

export const viewport: Viewport = {
  themeColor: "#0b0710",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
