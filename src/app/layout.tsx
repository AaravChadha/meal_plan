import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NutriTrack — Nutrition Tracking Dashboard",
  description: "Track your daily food intake with detailed macro and micronutrient breakdowns. Set goals, analyze trends, and optimize your nutrition.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
