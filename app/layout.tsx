import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NFL Predictions",
  description: "Free, mobile‑first NFL predictor",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="max-w-xl mx-auto p-4">{children}</div>
      </body>
    </html>
  );
}
