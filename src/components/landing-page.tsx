"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpenCheck, Bot, Mic, Network, Share2, Users } from "lucide-react";
import { useRouter } from "next/navigation";

export function LandingPage() {
  const router = useRouter();
  const features = [
    {
      icon: <Mic className="w-8 h-8 text-primary" />,
      title: "AI Speech-to-Text",
      description: "Capture every word of your lectures with real-time, AI-powered transcription.",
    },
    {
      icon: <Bot className="w-8 h-8 text-primary" />,
      title: "AI-Enhanced Notes",
      description: "Automatically refine and structure your raw notes into organized study guides.",
    },
    {
      icon: <Network className="w-8 h-8 text-primary" />,
      title: "AI Diagram Generation",
      description: "Visualize complex concepts by generating diagrams from your text notes.",
    },
    {
      icon: <BookOpenCheck className="w-8 h-8 text-primary" />,
      title: "Organized Notebooks",
      description: "Keep your study materials in order with a multi-level system of binders and notebooks.",
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: "Collaborative Sharing",
      description: "Share your notes and course materials with classmates for collaborative learning.",
    },
    {
        icon: <Share2 className="w-8 h-8 text-primary" />,
        title: "Google Workspace Theme",
        description: "Enjoy a clean, familiar, and productive interface inspired by Google Workspace.",
    },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Link href="#" className="flex items-center gap-2" prefetch={false}>
          <BookOpenCheck className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold font-headline">StudyVerse</span>
        </Link>
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/login')}>Log In</Button>
          <Button onClick={() => router.push('/register')}>Sign Up</Button>
        </div>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-secondary/50">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none font-headline">
                    Unlock Your Academic Potential with StudyVerse
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    The AI-powered learning environment designed to help you create, organize, and master your study materials.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button size="lg" onClick={() => router.push('/register')}>Get Started for Free</Button>
                </div>
              </div>
              <div className="hidden lg:block">
                  <BookOpenCheck className="h-auto w-full max-w-sm mx-auto text-primary/10" strokeWidth={0.5} />
              </div>
            </div>
          </div>
        </section>
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-secondary px-3 py-1 text-sm">Key Features</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">
                  A Smarter Way to Study
                </h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  StudyVerse integrates cutting-edge AI tools into a seamless, organized platform to elevate your learning experience.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none mt-12">
              {features.map((feature, index) => (
                <Card key={index} className="h-full transform transition-transform duration-300 hover:scale-105 hover:shadow-xl">
                  <CardHeader className="flex flex-row items-center gap-4">
                    {feature.icon}
                    <CardTitle className="font-headline text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 StudyVerse. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
