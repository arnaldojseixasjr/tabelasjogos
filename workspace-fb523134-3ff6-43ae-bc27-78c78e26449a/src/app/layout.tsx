import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Organizador de Campeonatos Escolares",
  description: "Web App para professores e coordenadores organizarem campeonatos esportivos escolares em quadra única, com geração automática de grade de jogos (Round Robin), restrição de descanso, drag-and-drop e exportação para PDF/Excel.",
  keywords: ["campeonato escolar", "esporte", "round robin", "grade de jogos", "futsal", "vôlei", "basquete", "handebol"],
  authors: [{ name: "Organizador Escolar" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
