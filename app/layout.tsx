import type { Metadata, Viewport } from "next";
import { Comic_Neue, Amiri } from "next/font/google";
import "./globals.css";
import PWAProvider from "@/components/pwa/PWAProvider";

const comicSans = Comic_Neue({
  subsets: ["latin"],
  variable: "--font-comic-sans",
  weight: ["300", "400", "700"],
});

// Arabic font for Quran text
const amiri = Amiri({
  subsets: ["arabic"],
  variable: "--font-arabic",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Afdyl - Al-Qur'an for Dyslexic",
  description: "Media pembelajaran interaktif Al-Quran dan Iqra untuk anak-anak Disleksia",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Afdyl",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Afdyl",
    title: "Afdyl - Belajar Al-Qur'an",
    description: "Media pembelajaran interaktif Al-Quran dan Iqra untuk anak-anak Disleksia",
  },
  twitter: {
    card: "summary",
    title: "Afdyl - Belajar Al-Qur'an",
    description: "Media pembelajaran interaktif Al-Quran dan Iqra untuk anak-anak Disleksia",
  },
};

export const viewport: Viewport = {
  themeColor: "#FDFFF2",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        {/* Preload Arabic fonts for better performance */}
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
          crossOrigin="anonymous"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* PWA Icons */}
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="icon" href="/icons/icon-192x192.png" sizes="192x192" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192x192.png" />
        {/* Splash screens for iOS */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Afdyl" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Afdyl" />
        <meta name="msapplication-TileColor" content="#C98151" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body
        className={`antialiased ${comicSans.variable} ${amiri.variable} font-sans overflow-x-hidden`}
      >
        <PWAProvider>
          {children}
        </PWAProvider>
      </body>
    </html>
  );
}
