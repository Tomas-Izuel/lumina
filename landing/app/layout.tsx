import type { Metadata, Viewport } from "next";
import { Instrument_Serif, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-serif",
});
const sans = Hanken_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-sans",
});
const mono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-mono",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://lumina.propital.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Lumina — Tours virtuales con IA para real estate",
    template: "%s · Lumina",
  },
  description:
    "Lumina convierte las fotos de una propiedad en un tour virtual en video, generado con IA. Profesional y listo para compartir — sin filmar, sin editar. Por API o desde la web.",
  applicationName: "Lumina",
  keywords: [
    "tour virtual inmobiliario",
    "recorrido virtual",
    "video con IA",
    "real estate IA",
    "tours virtuales",
    "inmobiliaria",
    "Lumina",
    "Propital",
  ],
  authors: [{ name: "Lumina" }],
  creator: "Lumina",
  publisher: "Lumina",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: SITE_URL,
    siteName: "Lumina",
    title: "Lumina — Tours virtuales con IA para real estate",
    description:
      "Fotos sueltas, un tour que vende. Tours virtuales en video generados con IA, en minutos.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumina — Tours virtuales con IA",
    description: "Fotos sueltas, un tour que vende. Generados con IA, en minutos.",
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
  themeColor: "#f1eef7",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${serif.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
