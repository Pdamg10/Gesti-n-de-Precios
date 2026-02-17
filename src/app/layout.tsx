import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Gestiór de Precios",
  description: "Sistema de control de precios con impuestos y ajustes",
  keywords: ["Precios", "Gestión", "Inventario", "Next.js", "React"],
  authors: [{ name: "Admin" }],
  icons: {
    icon: "/neumatico.svg",
  },
  openGraph: {
    title: "Gestiór de Precios",
    description: "Sistema de control de precios con impuestos y ajustes",
    url: "https://gestion-precios.app", // Placeholder
    siteName: "Gestiór de Precios",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gestiór de Precios",
    description: "Sistema de control de precios con impuestos y ajustes",
  },
};

import { ModalProvider } from "@/context/ModalContext";
import RateUpdater from "@/components/RateUpdater";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground overflow-x-hidden`}
      >
        <div className="fixed inset-0 bg-black -z-50">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-900 via-black to-black opacity-80"></div>
        </div>
        <ModalProvider>
          {children}
          <Toaster />
          <RateUpdater />
        </ModalProvider>
      </body>
    </html>
  );
}
