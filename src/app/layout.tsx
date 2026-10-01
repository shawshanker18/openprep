import type { Metadata, Viewport } from "next";
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
  description: "Find where you are, practise what matters, and track your way to your target SAT score. Free and open source.",
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
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        <footer className="mt-auto border-t px-4 py-3 text-center text-xs text-muted-foreground">
          SAT® is a trademark registered by the College Board, which is not affiliated with, and does not endorse, OpenPrep.
        </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
