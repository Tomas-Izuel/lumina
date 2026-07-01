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
    default: "Lumina — Kit de IA para real estate: estimación, video y 3D",
    template: "%s · Lumina",
  },
  description:
    "Lumina es un kit de IA para real estate: estimá el valor de venta y arriendo de una propiedad, convertí fotos en un tour virtual en video y —pronto— recorré su modelo 3D. Por API o desde la web.",
  applicationName: "Lumina",
  keywords: [
    "estimador de valor inmobiliario",
    "tasación con IA",
    "tour virtual inmobiliario",
    "recorrido virtual",
    "video con IA",
    "modelo 3D propiedad",
    "real estate IA",
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
    title: "Lumina — Kit de IA para real estate",
    description:
      "Estimá valor de venta y arriendo, convertí fotos en un tour y —pronto— recorré el modelo 3D. El kit de IA que potencia cada operación.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Lumina — Kit de IA para real estate",
    description: "Estimación, tour en video y modelo 3D, potenciados por IA.",
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
  themeColor: "#eeecf9",
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
