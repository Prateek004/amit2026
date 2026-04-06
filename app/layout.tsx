import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SideNav } from "@/components/SideNav";
import { BottomNav } from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "HissabWala - Smart POS for Indian Businesses",
  description: "Offline-first POS system with GST, billing, and inventory management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen overflow-hidden">
          <SideNav />
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            {children}
          </main>
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
