import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/footer-feedback";
import { ContentProtection } from "@/components/content-protection";
import { SIDEBAR_RESTORE } from "@/lib/sidebar";
import { Geist, Geist_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.openprep.site"),
  title: { default: "OpenPrep: free adaptive SAT prep", template: "%s · OpenPrep" },
  description: "Free SAT questions, lessons, timed practice tests, and progress tracking.",
  applicationName: "OpenPrep",
  appleWebApp: { capable: true, title: "OpenPrep", statusBarStyle: "default" },
  icons: { icon: [{ url: "/favicon.ico", sizes: "48x48" }, { url: "/icon-192.png", sizes: "192x192", type: "image/png" }], apple: "/apple-icon.png" },
  openGraph: { type: "website", siteName: "OpenPrep", title: "OpenPrep: free adaptive SAT prep", description: "Free SAT questions, lessons, timed practice tests, and progress tracking.", images: [{ url: "/brand/og.jpg", width: 1200, height: 630, alt: "OpenPrep" }] },
  twitter: { card: "summary_large_image", images: ["/brand/og.jpg"] },
};

export const viewport: Viewport = {
  viewportFit: "cover",
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#ffffff" }, { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" }],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <head><script dangerouslySetInnerHTML={{ __html: SIDEBAR_RESTORE }} /></head>
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
