import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gridiron LOD — NFL Line of Duty Disability Servicing",
  description:
    "A self-service platform helping retired NFL players file Line of Duty disability claims with confidence — guided intake, AI-driven medical-record analysis, records tracking, packet generation, and ERISA-grade audit trail.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow">
          Skip to main content
        </a>
        <main id="main">{children}</main>
      </body>
    </html>
  );
}
