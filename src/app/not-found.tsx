
import { Button } from '@/components/ui/button';
import { BookOpenCheck, Frown } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
        <Frown className="w-24 h-24 text-primary/20 mb-4" strokeWidth={1} />
        <h1 className="text-4xl font-bold font-headline mb-2">404 - Page Not Found</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
            Oops! It seems the page you were looking for doesn't exist or has been moved.
        </p>
        <Button asChild>
            <Link href="/">
                <BookOpenCheck className="mr-2 h-4 w-4" />
                Return to Home
            </Link>
        </Button>
    </div>
  );
}
