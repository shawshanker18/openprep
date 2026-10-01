import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "OpenPrep — free adaptive SAT prep",
  description: "Find where you are, practise what matters, and track your way to your target SAT score. Free and open source.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        <footer className="mt-auto border-t px-4 py-3 text-center text-xs text-muted-foreground">
          SAT® is a trademark registered by the College Board, which is not affiliated with, and does not endorse, OpenPrep.
        </footer>
      </body>
    </html>
  );
}
