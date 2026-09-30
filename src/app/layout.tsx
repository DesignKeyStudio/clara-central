import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ReactQueryProvider } from "@/lib/queries/provider";
import "./globals.css";

// Display serif — wordmark, page titles, section headings ("Books" character).
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

// Workhorse sans — body, labels, table data, buttons, numerics.
const plexSans = IBM_Plex_Sans({
  variable: "--font-plex",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Clara Central",
  description: "Referral management for agencies — track referrals, conversions, commission rates, and partner payouts.",
  // Private app — keep it out of search indexes entirely.
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${plexSans.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="lp-theme">
          <ReactQueryProvider>
            <TooltipProvider>
              {children}
              <Toaster />
            </TooltipProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
