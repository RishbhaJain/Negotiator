import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Negotiator",
  description: "Real-time pitch coach for high-stakes meetings",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
