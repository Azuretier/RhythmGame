import "./globals.css";

// This file is required by Next.js but the actual layout is in [locale]/layout.tsx
// Keeping minimal for locale-based routing

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
