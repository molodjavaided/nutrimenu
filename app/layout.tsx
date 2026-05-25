import type { Metadata } from "next";
import { Inter, Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppInitializer } from "@/components/AppInitializer";
import { Analytics } from "@vercel/analytics/next";
import { Toaster } from "sonner";
import { Providers } from "./providers";

// Body font — лучший шрифт для UI с поддержкой кириллицы.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  weight: ["400", "500", "600"],
});

// Heading font — геометричный, премиальный, отличная кириллица.
const manrope = Manrope({
  variable: "--font-heading",
  subsets: ["latin", "cyrillic"],
  display: "swap",
  weight: ["500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://plate.menu'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Plate — умное цифровое меню с КБЖУ и аллергенами',
    template: '%s | Plate',
  },
  description:
    'Создайте интерактивное цифровое меню для ресторана или кафе. Автоматический расчёт калорий и КБЖУ, подсветка аллергенов, мгновенные обновления по QR-коду.',
  keywords: ['цифровое меню', 'меню с КБЖУ', 'QR меню для ресторана', 'калории в блюдах', 'аллергены в меню'],
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Plate',
    title: 'Plate — умное цифровое меню с КБЖУ и аллергенами',
    description:
      'Создайте интерактивное цифровое меню для ресторана или кафе. Автоматический расчёт калорий, КБЖУ и аллергенов. QR-код обновляется мгновенно.',
    images: [{ url: '/og-default.png', width: 1200, height: 630, alt: 'Plate — цифровое меню' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Plate — умное цифровое меню с КБЖУ и аллергенами',
    description: 'Цифровое меню для ресторана: КБЖУ, аллергены, QR-код. Обновления — мгновенно.',
    images: ['/og-default.png'],
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>
          <AppInitializer />
          {children}
          <Analytics />
          <Toaster position="bottom-center" richColors />
        </Providers>
      </body>
    </html>
  );
}
