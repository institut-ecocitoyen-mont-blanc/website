import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Administration — Institut Ecocitoyen",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body id="outstatic">{children}</body>
    </html>
  );
}
