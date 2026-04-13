import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AuthBootstrap } from "@/components/providers/auth-bootstrap";
import { ReduxProvider } from "@/components/providers/redux-provider";
import { siteConfig } from "@/constants/site";
import { I18nProvider } from "@/features/i18n";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: siteConfig.name,
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ReduxProvider>
          <I18nProvider>
            <AuthBootstrap>{children}</AuthBootstrap>
          </I18nProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
