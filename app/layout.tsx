import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "loopaal · H0 revenue-ops co-workers",
  description: "A supervised AI revenue-ops agent with parallel co-workers, DynamoDB memory, and approval-gated outreach."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
