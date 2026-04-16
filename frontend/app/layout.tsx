import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AuthBootstrap } from "@/components/providers/auth-bootstrap";
import { ReduxProvider } from "@/components/providers/redux-provider";
import { siteConfig } from "@/constants/site";
import { I18nProvider } from "@/features/i18n";
import { ThemeProvider } from "@/features/theme";

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

const themeInitScript = `
(() => {
  const storageKey = "mm-theme";
  const defaultTheme = "light";

  try {
    const storedTheme = window.localStorage.getItem(storageKey);
    const theme = storedTheme === "dark" ? "dark" : defaultTheme;
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
  } catch {
    document.documentElement.setAttribute("data-theme", defaultTheme);
    document.documentElement.style.colorScheme = defaultTheme;
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-theme="light"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <ReduxProvider>
            <I18nProvider>
              <AuthBootstrap>{children}</AuthBootstrap>
            </I18nProvider>
          </ReduxProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
