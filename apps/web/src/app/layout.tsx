import type { Metadata } from 'next';
import { Providers } from '@/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Roadlyn - AI-Powered Roadmap Generation',
  description: 'Create intelligent, data-driven roadmaps with AI assistance',
  keywords: ['roadmap', 'ai', 'planning', 'saas'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
