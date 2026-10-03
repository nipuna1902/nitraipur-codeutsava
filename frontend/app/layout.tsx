import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Grid Simulator | Electron", description: "Interactive power grid digital twin and telemetry laboratory." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;

export const metadata: Metadata = {
  title: "ELECTRON Dashboard",
  description: "From Grid Anomaly to Field Action"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
