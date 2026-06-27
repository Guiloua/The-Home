import type { Metadata } from 'next';
import 'katex/dist/katex.min.css';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = {
  title: {
    default: 'NekoChan',
    template: '%s | NekoChan',
  },
  description: 'NekoChan personal site powered by Next.js, MDX and Tailwind CSS.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
