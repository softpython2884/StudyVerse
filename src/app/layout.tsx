import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import './globals.css';
import { cn } from '@/lib/utils';
import TitleBar from '@/components/title-bar';

export const metadata: Metadata = {
  title: 'StudyVerse - AI-Powered Learning Environment',
  description: 'Create, organize, and enhance your notes with the power of AI. StudyVerse offers real-time speech-to-text, note refinement, diagram generation, and more.',
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
      <body className={cn('font-body antialiased')} suppressHydrationWarning={true}>
        <TitleBar />
        <div className="content-container" style={{ height: 'calc(100vh - 32px)' }}>
            {children}
        </div>
        <Toaster />
      </body>
    </html>
  );
}
