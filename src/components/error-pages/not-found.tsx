"use client";

import { Button } from "@/components/ui/button";
import { FileX } from "lucide-react";
import Link from "next/link";

interface NotFoundProps {
  title?: string;
  message?: string;
}

export function DocumentNotFound({
  title = "Document Non Trouvé",
  message = "Le document que vous essayez d'atteindre n'existe pas, a été déplacé ou supprimé.",
}: NotFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <FileX className="w-24 h-24 text-primary/20 mb-4" strokeWidth={1} />
      <h1 className="text-3xl font-bold font-headline mb-2">{title}</h1>
      <p className="text-muted-foreground mb-6 max-w-md">{message}</p>
      <Button asChild>
        <Link href="/dashboard">Retourner au tableau de bord</Link>
      </Button>
    </div>
  );
}
