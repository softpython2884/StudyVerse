
'use client'

import { Button } from '@/components/ui/button';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center p-4">
        <TriangleAlert className="w-24 h-24 text-destructive/20 mb-4" strokeWidth={1} />
        <h1 className="text-4xl font-bold font-headline mb-2">Oops! Something went wrong.</h1>
        <p className="text-muted-foreground mb-6 max-w-md">
            An unexpected error occurred. You can try to refresh the page or contact support if the problem persists.
        </p>
        <Button onClick={() => reset()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
        </Button>
    </div>
  )
}
