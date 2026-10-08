import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/footer-feedback";
import { ContentProtection } from "@/components/content-protection";
import { SIDEBAR_RESTORE } from "@/lib/sidebar";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.openprep.site"),
  title: { default: "OpenPrep (Open Prep): Free SAT Prep Platform | Practice Tests & Questions", template: "%s · OpenPrep" },
  description: "OpenPrep (Open Prep) is a free SAT prep platform: adaptive practice, over 13,000 SAT questions, full-length practice tests, lessons and a personal study plan. No subscription, no ads.",
  keywords: ["OpenPrep", "Open Prep", "free SAT prep", "SAT practice tests", "SAT questions", "adaptive SAT practice", "digital SAT", "SAT study plan"],
  alternates: { canonical: "./" },
  other: { "msvalidate.01": "78A7934EB1F51F16CECD72CAD3455A09" }, // Bing Webmaster Tools ownership
  applicationName: "OpenPrep",
  appleWebApp: { capable: true, title: "OpenPrep", statusBarStyle: "default" },
  icons: { icon: [{ url: "/favicon.ico", sizes: "48x48" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/apple-icon.png" },
  openGraph: { type: "website", siteName: "OpenPrep", title: "OpenPrep: Free SAT Prep Platform", description: "Free adaptive SAT practice, over 13,000 questions, full-length practice tests and a personal study plan.", images: [{ url: "/brand/og.jpg", width: 1200, height: 630, alt: "OpenPrep" }] },
  twitter: { card: "summary_large_image", images: ["/brand/og.jpg"] },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }],
};

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://www.openprep.site";
// Tells search engines what OpenPrep is and what to call it ("OpenPrep", also written "Open Prep").
const STRUCTURED_DATA = [
  { "@context": "https://schema.org", "@type": "WebSite", "@id": `${SITE}/#website`, url: `${SITE}/`, name: "OpenPrep", alternateName: ["Open Prep", "OpenPrep SAT"], description: "Free SAT prep platform.", inLanguage: "en" },
  { "@context": "https://schema.org", "@type": "Organization", "@id": `${SITE}/#organization`, name: "OpenPrep", alternateName: "Open Prep", url: `${SITE}/`, logo: `${SITE}/icon-512.png` },
  { "@context": "https://schema.org", "@type": "WebApplication", "@id": `${SITE}/#app`, name: "OpenPrep", alternateName: "Open Prep", url: `${SITE}/`, applicationCategory: "EducationalApplication", operatingSystem: "Any (web browser)",
    description: "Free SAT prep: adaptive practice, over 13,000 SAT questions, full-length practice tests, lessons and a personal study plan.", isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" } },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SIDEBAR_RESTORE }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA).replace(/</g, "\\u003c") }} />
      </head>
      <body className="min-h-dvh min-w-0 flex flex-col bg-background text-foreground">
        <ThemeProvider>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        <SiteFooter />
        <ContentProtection />
        </ThemeProvider>
      </body>
    </html>
  );
}
