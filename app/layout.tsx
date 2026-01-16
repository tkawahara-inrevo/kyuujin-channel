// app/layout.tsx
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-[#EFF1F7] text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
