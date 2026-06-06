import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Inventory - 初心者にやさしいリアルタイム在庫管理",
  description: "在庫の過不足（不足・適正・過剰）を3色のシグナルで色分けし、一目で発注判断ができるNext.jsとSupabase製の在庫管理アプリです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

