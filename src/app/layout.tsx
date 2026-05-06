import type { Metadata } from "next";
import "./global.css";

export const metadata: Metadata = {
  title: "iota — Your private knowledge, searched, cited, and answered",
  description:
    "Drop in your PDFs, scrape your sites, plug your database — iota turns every document you own into a single chatbot that cites its sources. Built on retrieval-augmented generation with a private vector index.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-background text-foreground">{children}</body>
    </html>
  );
}
