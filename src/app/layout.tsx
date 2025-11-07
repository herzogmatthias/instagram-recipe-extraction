import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { ProcessingQueueProvider } from "@/lib/client/hooks/useProcessingQueue";
import { NavbarWrapper } from "@/components/navbar/NavbarWrapper";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Instagram Recipe Extraction",
  description: "Extract and analyze recipes from Instagram posts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${fraunces.variable} ${inter.variable}`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ProcessingQueueProvider>
            <NavbarWrapper />
            <div className="pt-16">{children}</div>
          </ProcessingQueueProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
