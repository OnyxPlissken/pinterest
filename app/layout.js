import { JetBrains_Mono, Manrope } from "next/font/google";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-sans"
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono"
});

export const metadata = {
  title: "ISAIA Pinterest Control",
  description: "Dashboard operativa per esplorare SharePoint, vedere l'anteprima e generare CSV Pinterest."
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="it"
      data-theme="dark"
      suppressHydrationWarning
      className={`${manrope.variable} ${jetBrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
