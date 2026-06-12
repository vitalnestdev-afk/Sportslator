import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const anton = localFont({
  src: "../fonts/anton-latin-400-normal.woff2",
  variable: "--font-anton",
});

const hanken = localFont({
  src: [
    { path: "../fonts/hanken-grotesk-latin-400-normal.woff2", weight: "400" },
    { path: "../fonts/hanken-grotesk-latin-600-normal.woff2", weight: "600" },
    { path: "../fonts/hanken-grotesk-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-hanken",
});

const spaceMono = localFont({
  src: [
    { path: "../fonts/space-mono-latin-400-normal.woff2", weight: "400" },
    { path: "../fonts/space-mono-latin-700-normal.woff2", weight: "700" },
  ],
  variable: "--font-spacemono",
});

export const metadata: Metadata = {
  title: "Sportslator",
  description:
    "Cross-sport equivalences, argued by the crowd. Arsenal is the Celtics. Fight us.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${anton.variable} ${hanken.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
