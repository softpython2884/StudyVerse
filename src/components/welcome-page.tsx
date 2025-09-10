
"use client"

import { BookOpenCheck, FolderKanban, PlusCircle, FilePlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

export function WelcomePage() {
    // Note: The onClick handlers for these buttons are in dashboard-page.tsx
    // This is a purely presentational component.
    const actions = [
        {
            icon: <FolderKanban className="w-6 h-6 text-primary" />,
            title: "New Binder",
            description: "Organize subjects by semester or topic.",
            // In a real app, this would trigger a dialog.
            // For now, it's just a visual placeholder.
            onClick: () => console.log("Open New Binder Dialog")
        },
        {
            icon: <FilePlus className="w-6 h-6 text-primary" />,
            title: "New Notebook",
            description: "Create a notebook for a specific course.",
             onClick: () => console.log("Open New Notebook Dialog")
        },
        {
            icon: <PlusCircle className="w-6 h-6 text-primary" />,
            title: "New Page",
            description: "Start writing in a fresh new page.",
             onClick: () => console.log("Open New Page Dialog")
        }
    ];

    return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <BookOpenCheck className="w-24 h-24 text-primary/20" strokeWidth={1} />
                <h1 className="text-3xl font-bold font-headline">Welcome to StudyVerse</h1>
                <p className="max-w-md text-muted-foreground">
                    Your personal learning environment. Select an item from the sidebar to get started, or create something new.
                </p>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
                {actions.map((action, index) => (
                     <Card key={index} className="transform transition-transform duration-300 hover:scale-105 hover:shadow-xl cursor-pointer">
                        <CardHeader>
                            <div className="flex items-center justify-center mb-2">
                                {action.icon}
                            </div>
                            <CardTitle className="font-headline text-xl text-center">{action.title}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground text-sm">{action.description}</p>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
