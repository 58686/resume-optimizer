import type { Metadata } from "next";
import { ToastProvider } from "@/components/toast-provider";
import { UserNav } from "@/components/user-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Resume Optimizer",
  description: "上传简历并对照职位要求生成针对性的优化建议。"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="scroll-smooth dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('ui-theme') || 'sunrise';
                document.documentElement.setAttribute('data-theme', theme);
              } catch (e) {}
            `
          }}
        />
      </head>
      <body className="font-sans bg-background text-foreground antialiased selection:bg-brand-accent/30 selection:text-white">
        <div className="aurora-bg"></div>
        <ToastProvider>
          <UserNav />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
