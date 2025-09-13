'use client';

import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Download, X } from 'lucide-react';
import { Card } from './ui/card';

// Define a type for the BeforeInstallPromptEvent
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallPwaBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      // The type assertion is necessary because the default Event type doesn't include prompt()
      const installEvent = event as BeforeInstallPromptEvent;
      event.preventDefault();
      
      // Check if the banner has been dismissed in this session
      const isDismissed = sessionStorage.getItem('pwa-install-banner-dismissed');
      if (!isDismissed) {
        setInstallPrompt(installEvent);
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if the app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
        setIsVisible(false);
    }
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    // Show the browser's installation prompt
    await installPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the PWA installation');
    } else {
      console.log('User dismissed the PWA installation');
    }
    
    // Hide the banner regardless of the outcome
    setIsVisible(false);
    setInstallPrompt(null);
  };
  
  const handleDismissClick = () => {
    setIsVisible(false);
    // Remember the dismissal for this session
    sessionStorage.setItem('pwa-install-banner-dismissed', 'true');
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="p-4 print-hidden">
        <Card className="p-4 bg-secondary flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Download className="h-8 w-8 text-primary" />
            <div>
            <h3 className="font-semibold">Get the StudyVerse App</h3>
            <p className="text-sm text-muted-foreground">Install the app for a better experience with offline access.</p>
            </div>
        </div>
        <div className="flex items-center gap-2">
            <Button onClick={handleInstallClick}>
            Install
            </Button>
             <Button variant="ghost" size="icon" onClick={handleDismissClick}>
                <X className="h-4 w-4" />
            </Button>
        </div>
        </Card>
    </div>
  );
}
