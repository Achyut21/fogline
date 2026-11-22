import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import { Hanken_Grotesk } from "next/font/google";
import { ThemeProvider } from "@/components/system/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { app } from "@/copy";
import { themeColor } from "@/styles/theme-color";
import "./globals.css";

const sans = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: app.name,
  title: app.name,
  description: app.description,
  appleWebApp: { capable: true, title: app.name, statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: themeColor.day },
    { media: "(prefers-color-scheme: dark)", color: themeColor.night },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${sans.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="flex min-h-full flex-col">
        <SerwistProvider
          swUrl="/serwist/sw.js"
          disable={process.env.NODE_ENV === "development"}
          reloadOnOnline={false}
          cacheOnNavigation={false}
        >
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </SerwistProvider>
      </body>
    </html>
  );
}
