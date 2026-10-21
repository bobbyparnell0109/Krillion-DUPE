import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SITE } from "@/config/site";
import { Providers } from "@/components/layout/Providers";
import { OceanBackdrop } from "@/components/ocean/OceanBackdrop";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: { default: `${SITE.name}: ${SITE.tagline}`, template: `%s | ${SITE.name}` },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: ["trivia", "daily puzzle", "word game", "quiz", "rarest answer", "browser game"],
  openGraph: {
    type: "website",
    siteName: SITE.name,
    title: `${SITE.name}: ${SITE.tagline}`,
    description: SITE.description,
    url: SITE.url,
  },
  twitter: { card: "summary_large_image", title: SITE.name, description: SITE.description },
  alternates: { canonical: "/" },
};

export const viewport: Viewport = {
  themeColor: "#04122b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col">
        <a href="#main" className="skip-link">Skip to content</a>
        <Providers>
          <OceanBackdrop />
          <SiteHeader />
          <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4">
            {children}
          </main>
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
