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
  title: { default: "OpenPrep: free adaptive SAT prep", template: "%s · OpenPrep" },
  description: "Free SAT questions, lessons, timed practice tests, and progress tracking.",
  applicationName: "OpenPrep",
  appleWebApp: { capable: true, title: "OpenPrep", statusBarStyle: "default" },
  icons: { icon: "/icon.svg", apple: "/apple-icon.png" },
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
