import type { Metadata } from "next";
import { Bitcount_Grid_Double, Fira_Code, Public_Sans, Russo_One } from "next/font/google";
import "./globals.css";

const publicSans = Public_Sans({
  subsets: ["latin"],
  variable: "--font-public-sans"
});

const bitcountGridDouble = Bitcount_Grid_Double({
  subsets: ["latin"],
  variable: "--font-bitcount-grid-double"
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
      <body className={`${publicSans.variable} ${bitcountGridDouble.variable} ${russoOne.variable} ${firaCode.variable}`}>
        {children}
      </body>
    </html>
  );
}
