import type { Metadata } from "next";
import localFont from 'next/font/local';
import "./globals.css";

const ibmPlex = localFont({
  src: [
    {
      path: '../../public/fonts/IBM_Plex_Sans_Arabic/IBMPlexSansArabic-Regular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/IBM_Plex_Sans_Arabic/IBMPlexSansArabic-Medium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/IBM_Plex_Sans_Arabic/IBMPlexSansArabic-SemiBold.ttf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/fonts/IBM_Plex_Sans_Arabic/IBMPlexSansArabic-Bold.ttf',
      weight: '700',
      style: 'normal',
    }
  ],
  variable: '--font-ibm-plex',
});

const switzer = localFont({
  src: [
    {
      path: '../../public/fonts/switzer-font-family/Switzer-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/switzer-font-family/Switzer-Medium.otf',
      weight: '500',
      style: 'normal',
    },
    {
      path: '../../public/fonts/switzer-font-family/Switzer-Semibold.otf',
      weight: '600',
      style: 'normal',
    },
    {
      path: '../../public/fonts/switzer-font-family/Switzer-Bold.otf',
      weight: '700',
      style: 'normal',
    }
  ],
  variable: '--font-switzer',
});

export const metadata: Metadata = {
  title: "Massar Work OS",
  description: "Internal operations for Massar",
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" className={`${ibmPlex.variable} ${switzer.variable}`} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
