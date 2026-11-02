import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaddyTrace — Karnataka Paddy Procurement Transparency",
  description:
    "Tamper-evident, audit-grade digital transaction record and verification platform for paddy farmers in Karnataka.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}

