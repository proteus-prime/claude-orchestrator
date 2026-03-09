import type { Metadata } from "next";
import { Electrolize, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const electrolize = Electrolize({
  variable: "--font-electrolize",
  weight: "400",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Proteus Dev Hub",
  description: "Real-time Claude Code session monitoring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${electrolize.variable} ${geistMono.variable} antialiased bg-slate-950 text-slate-100`}
        style={{ fontFamily: "var(--font-electrolize), sans-serif" }}
      >
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-60 min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
