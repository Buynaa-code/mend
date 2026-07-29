import type { Metadata } from "next";
import { Geist_Mono, Nunito } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const title = "mend. — Төрсөн өдрийн мэндчилгээ";
const description =
  "Дурсамж, захиа, аялгуутай интерактив төрсөн өдрийн scrapbook бүтээж, онцгой мөчөө хуваалцаарай.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  const origin = host ? `${protocol}://${host}` : "https://mend.gift";
  const image = new URL("/og.png", origin).toString();

  return {
    metadataBase: new URL(origin),
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      locale: "mn_MN",
      images: [{ url: image, width: 1732, height: 908, alt: "mend." }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="mn">
      <body
        className={`${nunito.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
