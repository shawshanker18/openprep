import type { Metadata, Viewport } from "next";
import { FooterFeedback } from "@/components/footer-feedback";
import { Geist, Geist_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme";
import { NoInspect } from "@/components/no-inspect";

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
      <body className="min-h-dvh min-w-0 flex flex-col bg-background text-foreground">
        <ThemeProvider>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        <NoInspect />
        <footer className="site-footer mt-auto border-t px-4 py-3 text-center text-xs text-muted-foreground">
          SAT® is a trademark registered by the College Board, which is not affiliated with, and does not endorse, OpenPrep.<FooterFeedback />
        </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
