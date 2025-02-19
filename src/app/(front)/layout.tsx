import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Institut Ecocitoyen du Pays du Mont Blanc",
  description:
    "Développer et partager une connaissance scientifique indépendante des pollutions et leurs effets sur la santé",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <Header />
        <div>
          {" "}
          {/* Add padding to account for fixed header */}
          {children}
        </div>
        <Footer />
      </body>
    </html>
  );
}
