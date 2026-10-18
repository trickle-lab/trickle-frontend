import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { WalletProvider } from "@/contexts/wallet-context";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Trickle — Streaming Payments on Stellar",
  description:
    "Lock funds once, stream them to anyone on Stellar continuously over time.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-zinc-950 text-zinc-50">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
