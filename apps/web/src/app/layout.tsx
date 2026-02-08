import type { Metadata } from 'next';
import { Providers } from '@/providers/thirdweb-provider';
import { ToastProvider } from '@/components/ui/toast-provider';
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
    <html lang="en" style={{ backgroundColor: '#0A0A0A', colorScheme: 'dark' }}>
      <body className="font-sans antialiased bg-background text-foreground min-h-screen">
        <Providers>{children}</Providers>
        <ToastProvider />
      </body>
    </html>
  );
}
