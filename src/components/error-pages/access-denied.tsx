"use client";

import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";

interface AccessDeniedProps {
  title?: string;
  message?: string;
}

export function AccessDenied({
  title = "Accès Refusé",
  message = "Vous n'avez pas la permission d'accéder à cette ressource. Veuillez contacter le propriétaire si vous pensez qu'il s'agit d'une erreur.",
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <ShieldAlert
        className="w-24 h-24 text-destructive/20 mb-4"
        strokeWidth={1}
      />
      <h1 className="text-3xl font-bold font-headline mb-2">{title}</h1>
      <p className="text-muted-foreground mb-6 max-w-md">{message}</p>
      <Button asChild>
        <Link href="/dashboard">Retourner au tableau de bord</Link>
      </Button>
    </div>
  );
}
