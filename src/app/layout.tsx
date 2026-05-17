import type { Metadata } from "next";
import "./globals.css";
import "@/styles/proposal.css";

export const metadata: Metadata = {
  title: "Fihuma Proposal Builder",
  description: "Component-based offerte-engine voor Fihuma Collectief"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
