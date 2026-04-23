import "./globals.css";

export const metadata = {
  title: "ISAIA Pinterest CSV Generator",
  description: "Genera CSV Pinterest da SharePoint e pubblica le immagini su Vercel Blob."
};

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
