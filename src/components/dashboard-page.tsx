"use client";

import * as React from "react";
import Link from "next/link";
import {
  BookOpen,
  BookOpenCheck,
  ChevronDown,
  FileText,
  FolderKanban,
  LogOut,
  PanelLeft,
  Search,
  Settings,
  StickyNote,
  User,
  PlusCircle,
  type LucideIcon,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import type { Binder, Notebook, Page, User as UserType } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { createBinder, createNotebook, createPage } from "@/lib/actions";

const icons: { [key: string]: LucideIcon } = {
  FolderKanban,
  BookOpen,
  FileText,
  StickyNote,
};

const predefinedColors = [
    "bg-red-200", "bg-yellow-200", "bg-green-200", "bg-blue-200", 
    "bg-indigo-200", "bg-purple-200", "bg-pink-200", "bg-gray-200"
];

const Icon = ({ name }: { name: string }) => {
    const LucideIcon = icons[name];
    if (!LucideIcon) return null;
    return <LucideIcon className="h-4 w-4" />;
}

export function DashboardPage({ initialData, children, user }: { initialData: Binder[], children: React.ReactNode, user: UserType | null }) {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = React.useState(initialData);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Update data when initialData changes
  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);


  // --- State for dialogs ---
  const [isBinderDialogOpen, setIsBinderDialogOpen] = React.useState(false);
  const [isNotebookDialogOpen, setIsNotebookDialogOpen] = React.useState(false);
  const [isPageDialogOpen, setIsPageDialogOpen] = React.useState(false);
  
  const [activeBinderId, setActiveBinderId] = React.useState<string | null>(null);
  const [activeNotebookId, setActiveNotebookId] = React.useState<string | null>(null);

  // --- Form State ---
  const [newItem, setNewItem] = React.useState({
      title: "",
      color: predefinedColors[0],
      tags: "",
      type: "note" as "course" | "note"
  });

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (response.ok) {
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
        router.push('/login');
        router.refresh();
      } else {
        toast({ title: "Logout Failed", description: "Something went wrong.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Logout Failed", description: "An unexpected error occurred.", variant: "destructive" });
    }
  };

  const getActivePage = () => {
    const { binderId, notebookId, pageId } = params;
    if (!binderId || !notebookId || !pageId) return null;
    const binder = data.find(b => b.id === binderId);
    if (!binder) return null;
    const notebook = binder.notebooks.find(n => n.id === notebookId);
    if (!notebook) return null;
    return notebook.pages.find(p => p.id === pageId) || null;
  }

  const currentPage = getActivePage();
  
  const resetNewItem = () => {
      setNewItem({ title: "", color: predefinedColors[0], tags: "", type: "note"});
  }

  const handleCreateBinder = async () => {
      if (!newItem.title) {
          toast({ title: "Error", description: "Binder title is required.", variant: "destructive" });
          return;
      }
      const result = await createBinder({ title: newItem.title });
      if (result.success) {
          toast({ title: "Success", description: "Binder created successfully."});
          router.refresh();
      } else {
          toast({ title: "Error", description: result.message, variant: "destructive" });
      }
      setIsBinderDialogOpen(false);
      resetNewItem();
  };

  const handleCreateNotebook = async () => {
      if (!newItem.title || !activeBinderId) {
          toast({ title: "Error", description: "Notebook title and active binder are required.", variant: "destructive" });
          return;
      }
      const result = await createNotebook({ 
          title: newItem.title, 
          binderId: activeBinderId,
          color: newItem.color,
          tags: newItem.tags.split(',').map(t => t.trim()).filter(Boolean)
      });
       if (result.success) {
          toast({ title: "Success", description: "Notebook created successfully."});
          router.refresh();
      } else {
          toast({ title: "Error", description: result.message, variant: "destructive" });
      }
      setIsNotebookDialogOpen(false);
      resetNewItem();
  };

  const handleCreatePage = async () => {
    if (!newItem.title || !activeBinderId || !activeNotebookId) {
        toast({ title: "Error", description: "Page title and active notebook are required.", variant: "destructive" });
        return;
    }
     const result = await createPage({ 
          title: newItem.title, 
          notebookId: activeNotebookId,
          type: newItem.type
      });

    if (result.success && result.pageId) {
        toast({ title: "Success", description: "Page created successfully."});
        router.push(`/dashboard/${activeBinderId}/${activeNotebookId}/${result.pageId}`);
        router.refresh();
    } else {
        toast({ title: "Error", description: result.message, variant: "destructive" });
    }
    
    setIsPageDialogOpen(false);
    resetNewItem();
};

  const filteredData = React.useMemo(() => {
    if (!searchQuery) {
      return data;
    }
    const lowercasedQuery = searchQuery.toLowerCase();
    return data.map(binder => {
      const filteredNotebooks = binder.notebooks.map(notebook => {
        const filteredPages = notebook.pages.filter(page =>
          page.title.toLowerCase().includes(lowercasedQuery)
        );
        if (filteredPages.length > 0 || notebook.title.toLowerCase().includes(lowercasedQuery)) {
          return { ...notebook, pages: filteredPages };
        }
        return null;
      }).filter(Boolean) as Notebook[];

      if (filteredNotebooks.length > 0 || binder.title.toLowerCase().includes(lowercasedQuery)) {
        return { ...binder, notebooks: filteredNotebooks };
      }
      return null;
    }).filter(Boolean) as Binder[];
  }, [searchQuery, data]);

  return (
    <SidebarProvider>
      <div className="flex min-h-screen bg-secondary/10">
        <Sidebar>
          <SidebarHeader>
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="h-9 w-9" asChild>
                        <Link href="/">
                            <BookOpenCheck className="h-6 w-6 text-primary" />
                        </Link>
                    </Button>
                    <h2 className="text-lg font-semibold font-headline tracking-tight">StudyVerse</h2>
                </div>
                <Dialog open={isBinderDialogOpen} onOpenChange={setIsBinderDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <PlusCircle className="h-4 w-4" />
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create New Binder</DialogTitle>
                            <DialogDescription>
                                Binders help you organize your notebooks by semester or subject.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="binder-title">Title</Label>
                                <Input id="binder-title" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="e.g., Fall Semester 2024" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsBinderDialogOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateBinder}>Create Binder</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-2">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." className="pl-8" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>

            <SidebarMenu>
              {filteredData.map((binder: Binder) => (
                <Collapsible key={binder.id} className="w-full" defaultOpen>
                    <div className="w-full group relative flex items-center">
                        <SidebarMenuItem className="w-full">
                            <CollapsibleTrigger asChild>
                                <SidebarMenuButton className="font-semibold" isActive={false}>
                                    <Icon name={binder.icon} />
                                    <span>{binder.title}</span>
                                    <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                                </SidebarMenuButton>
                            </CollapsibleTrigger>
                        </SidebarMenuItem>
                         <Dialog open={isNotebookDialogOpen} onOpenChange={setIsNotebookDialogOpen}>
                            <DialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto opacity-0 group-hover:opacity-100 absolute right-2 top-1" onClick={(e) => { e.stopPropagation(); setActiveBinderId(binder.id); }}>
                                    <PlusCircle className="h-4 w-4" />
                                </Button>
                            </DialogTrigger>
                        </Dialog>
                    </div>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <div className="pl-4">
                      {binder.notebooks.map((notebook: Notebook) => (
                        <Collapsible key={notebook.id} className="w-full" defaultOpen>
                            <div className="w-full group relative flex items-center">
                                <SidebarMenuItem className="w-full">
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton isActive={false}>
                                            <div className="flex items-start gap-2 w-full">
                                                <span className={cn("h-3 w-3 mt-1 rounded-full flex-shrink-0", notebook.color)}></span>
                                                <div className="flex flex-col items-start w-full overflow-hidden">
                                                    <span className="truncate w-full">{notebook.title}</span>
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {notebook.tags.map(tag => <Badge key={tag} variant="secondary" className="h-4 text-[10px]">{tag}</Badge>)}
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180 flex-shrink-0" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                </SidebarMenuItem>
                                 <Dialog open={isPageDialogOpen} onOpenChange={setIsPageDialogOpen}>
                                    <DialogTrigger asChild>
                                         <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto opacity-0 group-hover:opacity-100 absolute right-2 top-1" onClick={(e) => { e.stopPropagation(); setActiveBinderId(binder.id); setActiveNotebookId(notebook.id); }}>
                                            <PlusCircle className="h-4 w-4" />
                                        </Button>
                                    </DialogTrigger>
                                </Dialog>
                            </div>
                          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                            <div className="pl-6">
                              {notebook.pages.map((page: Page) => (
                                <SidebarMenuItem key={page.id}>
                                  <Link href={`/dashboard/${binder.id}/${notebook.id}/${page.id}`}>
                                    <SidebarMenuButton
                                      isActive={params.pageId === page.id}
                                    >
                                      <Icon name={page.icon} />
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
                      <Button variant="ghost" className="flex items-center gap-2 rounded-full h-9">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user?.avatarUrl || ''} alt={user?.name || 'User'}/>
                            <AvatarFallback>{user ? user.name.charAt(0).toUpperCase() : 'G'}</AvatarFallback>
                          </Avatar>
                          <span>{user?.name || 'Guest User'}</span>
                          <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>{user?.name || "Guest"}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Logout</span>
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </header>
          
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </SidebarInset>
        
        {/* Notebook Creation Dialog */}
        <Dialog open={isNotebookDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) resetNewItem(); setIsNotebookDialogOpen(isOpen);}}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Notebook</DialogTitle>
                    <DialogDescription>
                        Notebooks live inside binders and contain your pages.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="notebook-title">Title</Label>
                        <Input id="notebook-title" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="e.g., Advanced AI" />
                    </div>
                     <div>
                        <Label>Color</Label>
                        <div className="flex gap-2 pt-2">
                        {predefinedColors.map(color => (
                            <button key={color} onClick={() => setNewItem({...newItem, color})} className={cn("h-6 w-6 rounded-full border-2", newItem.color === color ? 'border-primary' : 'border-transparent')}>
                                <div className={cn("h-full w-full rounded-full", color)}></div>
                            </button>
                        ))}
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="notebook-tags">Tags</Label>
                        <Input id="notebook-tags" value={newItem.tags} onChange={e => setNewItem({...newItem, tags: e.target.value})} placeholder="e.g., CS, AI, Hard (comma-separated)" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsNotebookDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreateNotebook}>Create Notebook</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Page Creation Dialog */}
         <Dialog open={isPageDialogOpen} onOpenChange={(isOpen) => { if(!isOpen) resetNewItem(); setIsPageDialogOpen(isOpen);}}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Page</DialogTitle>
                    <DialogDescription>
                        Pages are where your content lives. Choose a title and type.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="page-title">Title</Label>
                        <Input id="page-title" value={newItem.title} onChange={e => setNewItem({...newItem, title: e.target.value})} placeholder="e.g., Lecture 1: Intro" />
                    </div>
                    <div>
                        <Label>Page Type</Label>
                        <Select onValueChange={(value: "course" | "note") => setNewItem({...newItem, type: value})} defaultValue={newItem.type}>
                             <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="note"><StickyNote className="inline-block mr-2 h-4 w-4" /> My Study Notes</SelectItem>
                                <SelectItem value="course"><FileText className="inline-block mr-2 h-4 w-4" /> Course Document</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsPageDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleCreatePage}>Create Page</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </SidebarProvider>
  );
}
