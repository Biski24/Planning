import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planning Agence",
  description: "Gestion de planning d'agence avec cycles de 4 semaines",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
