import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "사주 입력 MVP",
  description: "사주 계산 엔진 연동 전 입력 및 JSON 검증용 MVP"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
