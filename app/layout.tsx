import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "loopaal · supervised revenue co-workers",
  description: "Supervised AI co-workers for B2B research, outreach, memory, approvals, and client follow-up."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
