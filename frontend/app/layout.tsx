import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ELECTRON | Grid Intelligence",
  description: "From grid anomaly to field action"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
