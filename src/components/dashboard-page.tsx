"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  BookOpenCheck,
  ChevronDown,
  Circle,
  FolderKanban,
  PanelLeft,
  Search,
  Settings,
  User,
} from "lucide-react";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarTrigger,
  SidebarInset,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { mockData } from "@/lib/mock-data";
import type { Binder, Notebook, Page } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DocumentEditor } from "@/components/document-editor";
import { NoteEditor } from "@/components/note-editor";
import { useParams, useRouter } from "next/navigation";


export function DashboardPage({ initialActivePage }: { initialActivePage: Page | null }) {
  const [activePage, setActivePage] = React.useState<Page | null>(null);
  const params = useParams();
  const router = useRouter();

  React.useEffect(() => {
    setActivePage(initialActivePage);
  }, [initialActivePage]);

  const handlePageSelect = (binderId: string, notebookId: string, pageId: string) => {
    router.push(`/dashboard/${binderId}/${notebookId}/${pageId}`);
  };

  const getActivePage = () => {
    const { binderId, notebookId, pageId } = params;
    const binder = mockData.find(b => b.id === binderId);
    if (!binder) return null;
    const notebook = binder.notebooks.find(n => n.id === notebookId);
    if (!notebook) return null;
    return notebook.pages.find(p => p.id === pageId) || null;
  }

  const currentPage = getActivePage();


  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-secondary/10">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                    <Link href="/">
                        <BookOpenCheck className="h-6 w-6 text-primary" />
                    </Link>
                </Button>
                <h2 className="text-lg font-semibold font-headline tracking-tight">StudyVerse</h2>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-2">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8" />
            </div>

            <SidebarMenu>
              {mockData.map((binder: Binder) => (
                <Collapsible key={binder.id} className="w-full" defaultOpen>
                  <CollapsibleTrigger asChild>
                    <div className="w-full group">
                        <SidebarMenuItem>
                            <SidebarMenuButton className="font-semibold" isActive={false}>
                                <binder.icon className="h-4 w-4" />
                                <span>{binder.title}</span>
                                <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <div className="pl-4">
                      {binder.notebooks.map((notebook: Notebook) => (
                        <Collapsible key={notebook.id} className="w-full" defaultOpen>
                          <CollapsibleTrigger asChild>
                            <div className="w-full group">
                                <SidebarMenuItem>
                                <SidebarMenuButton isActive={false}>
                                    <div className="flex items-center gap-2">
                                    <notebook.icon className="h-4 w-4" />
                                    <span>{notebook.title}</span>
                                    </div>
                                    <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </SidebarMenuButton>
                                </SidebarMenuItem>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                            <div className="pl-6">
                              {notebook.pages.map((page: Page) => (
                                <SidebarMenuItem key={page.id}>
                                  <Link href={`/dashboard/${binder.id}/${notebook.id}/${page.id}`}>
                                    <SidebarMenuButton
                                      isActive={params.pageId === page.id}
                                    >
                                      <page.icon className="h-4 w-4" />
                                      <span>{page.title}</span>
                                    </SidebarMenuButton>
                                  </Link>
                                </SidebarMenuItem>
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton>
                    <Settings className="h-4 w-4" />
                    Settings
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="p-0">
            <header className="flex items-center justify-between p-4 md:p-6 lg:p-8 border-b bg-background">
                <div className="flex items-center gap-4">
                    <SidebarTrigger>
                        <PanelLeft />
                    </SidebarTrigger>
                    <div>
                        <h1 className="text-2xl font-bold font-headline">{currentPage?.title || "Welcome"}</h1>
                        <p className="text-sm text-muted-foreground">Select a page to start editing.</p>
                    </div>
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                        <User className="h-5 w-5" />
                        <span className="sr-only">Toggle user menu</span>
                    </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Billing</DropdownMenuItem>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <Link href="/">Logout</Link>
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>
          
            <main className="flex-1 overflow-auto">
                {currentPage ? (
                    currentPage.type === 'note' ? (
                      <NoteEditor key={`${params.binderId}-${params.notebookId}-${params.pageId}`} page={currentPage} />
                    ) : (
                      <DocumentEditor key={`${params.binderId}-${params.notebookId}-${params.pageId}`} page={currentPage} />
                    )
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-muted-foreground">Select a notebook and page to start your work.</p>
                    </div>
                )}
            </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
