import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { cn } from '@/lib/utils';
import { PwaLoader } from '@/components/pwa-loader';

export const metadata: Metadata = {
  title: 'StudyVerse - AI-Powered Learning Environment',
  description: 'Create, organize, and enhance your notes with the power of AI. StudyVerse offers real-time speech-to-text, note refinement, diagram generation, and more.',
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Alegreya:wght@400;500;700&display=swap" rel="stylesheet" />
        <meta name="theme-color" content="#708090" />
      </head>
      <body className={cn('font-body antialiased')}>
        <PwaLoader />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
