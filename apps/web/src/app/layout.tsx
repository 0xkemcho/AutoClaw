import type { Metadata } from 'next';
import { Providers } from '@/providers/thirdweb-provider';
import './globals.css';

export const metadata: Metadata = {
  title: 'AutoClaw - AI-Powered FX Investment on Celo',
  description:
    'Personalized FX token recommendations, Mento swaps, and recurring investments powered by AI.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
