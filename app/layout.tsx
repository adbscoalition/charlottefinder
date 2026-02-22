import type { Metadata } from "next";
import { Fira_Code, Public_Sans, Russo_One, Unbounded } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans"
});

const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-unbounded"
});

const russoOne = Russo_One({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-russo-one"
});

const firaCode = Fira_Code({
  subsets: ["latin"],
  variable: "--font-fira-code"
});

export const metadata: Metadata = {
  title: "Charlotte Finder",
  description: "Compass-style direction and magnetic field strength toward Charlotte, NC"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${publicSans.variable} ${unbounded.variable} ${russoOne.variable} ${firaCode.variable}`}>
        {children}
      </body>
    </html>
  );
}
