
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
  MoreVertical,
  Edit,
  Trash2,
  type LucideIcon,
  Network,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Binder, Notebook, Page, User as UserType } from "@/lib/types";
import { useParams, useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Badge } from "./ui/badge";
import { cn } from "@/lib/utils";
import { createBinder, createNotebook, createPage, deleteBinder, deleteNotebook, deletePage, renameBinder, renameNotebook, renamePage } from "@/lib/actions";

const icons: { [key: string]: LucideIcon } = {
  FolderKanban,
  BookOpen,
  FileText,
  StickyNote,
  Network
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

  // --- State for dialogs ---
  const [isBinderDialogOpen, setIsBinderDialogOpen] = React.useState(false);
  const [isNotebookDialogOpen, setIsNotebookDialogOpen] = React.useState(false);
  const [isPageDialogOpen, setIsPageDialogOpen] = React.useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = React.useState(false);

  const [activeBinderId, setActiveBinderId] = React.useState<string | null>(null);
  const [activeNotebookId, setActiveNotebookId] = React.useState<string | null>(null);

  const [renameTarget, setRenameTarget] = React.useState<{ id: string; title: string; type: 'binder' | 'notebook' | 'page' } | null>(null);
  const [newTitle, setNewTitle] = React.useState("");

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // --- Form State ---
  const [newItem, setNewItem] = React.useState({
      title: "",
      color: predefinedColors[0],
      tags: "",
      type: "document" as "document" | "diagram"
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
      setNewItem({ title: "", color: predefinedColors[0], tags: "", type: "document"});
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

  const handleRename = async () => {
      if (!renameTarget || !newTitle) {
          toast({ title: "Error", description: "New title is required.", variant: "destructive" });
          return;
      }
      let result;
      switch (renameTarget.type) {
          case 'binder': result = await renameBinder({ id: renameTarget.id, newTitle }); break;
          case 'notebook': result = await renameNotebook({ id: renameTarget.id, newTitle }); break;
          case 'page': result = await renamePage({ id: renameTarget.id, newTitle }); break;
      }

      if (result.success) {
          toast({ title: "Success", description: `${renameTarget.type} renamed.` });
          router.refresh();
      } else {
          toast({ title: "Error", description: result.message, variant: "destructive" });
      }
      setIsRenameDialogOpen(false);
      setRenameTarget(null);
      setNewTitle("");
  };

  const handleDelete = async (id: string, type: 'binder' | 'notebook' | 'page') => {
      let result;
      switch (type) {
          case 'binder': result = await deleteBinder({ id }); break;
          case 'notebook': result = await deleteNotebook({ id }); break;
          case 'page': result = await deletePage({ id }); break;
      }

      if (result.success) {
          toast({ title: "Success", description: `${type} deleted.` });
          if (type === 'page' && params.pageId === id) {
              router.push('/dashboard');
          }
          router.refresh();
      } else {
          toast({ title: "Error", description: result.message, variant: "destructive" });
      }
  };

  const openRenameDialog = (id: string, title: string, type: 'binder' | 'notebook' | 'page') => {
    setRenameTarget({ id, title, type });
    setNewTitle(title);
    setIsRenameDialogOpen(true);
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

  const ItemMenu = ({ id, title, type }: { id: string, title: string, type: 'binder' | 'notebook' | 'page' }) => (
    <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                <MoreVertical className="h-4 w-4" />
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent onClick={e => e.stopPropagation()}>
            <DropdownMenuItem onClick={() => openRenameDialog(id, title, type)}>
                <Edit className="mr-2 h-4 w-4" /> Rename
            </DropdownMenuItem>
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                    </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the {type} and all its contents.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(id, type)}>Continue</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </DropdownMenuContent>
    </DropdownMenu>
  );

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
                <Collapsible key={binder.id} className="w-full" defaultOpen={binder.id === params.binderId}>
                  <div className="flex items-center justify-between group">
                      <SidebarMenuItem className="flex-1">
                          <CollapsibleTrigger asChild>
                              <SidebarMenuButton className="font-semibold w-full pr-0" isActive={false}>
                                  <Icon name={binder.icon} />
                                  <span className="flex-1 truncate">{binder.title}</span>
                                  <ChevronDown className="ml-auto h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                              </SidebarMenuButton>
                          </CollapsibleTrigger>
                      </SidebarMenuItem>
                       <div className="flex items-center pr-2">
                           <Dialog open={isNotebookDialogOpen} onOpenChange={setIsNotebookDialogOpen}>
                              <DialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setActiveBinderId(binder.id); }}>
                                      <PlusCircle className="h-4 w-4" />
                                  </Button>
                              </DialogTrigger>
                          </Dialog>
                          <ItemMenu id={binder.id} title={binder.title} type="binder" />
                       </div>
                  </div>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                    <div className="pl-4">
                      {binder.notebooks.map((notebook: Notebook) => (
                        <Collapsible key={notebook.id} className="w-full" defaultOpen={notebook.id === params.notebookId}>
                            <div className="flex items-center justify-between group">
                                <SidebarMenuItem className="flex-1">
                                    <CollapsibleTrigger asChild>
                                        <SidebarMenuButton isActive={false} className="w-full pr-0">
                                            <div className="flex items-center gap-2 w-full">
                                                <span className={cn("h-3 w-3 mt-1 rounded-full flex-shrink-0", notebook.color)}></span>
                                                <div className="flex-1 flex items-center justify-between overflow-hidden">
                                                    <span className="truncate">{notebook.title}</span>
                                                    <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                                        {notebook.tags.map(tag => <Badge key={tag} variant="secondary" className="h-4 text-[10px]">{tag}</Badge>)}
                                                    </div>
                                                </div>
                                            </div>
                                            <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180 flex-shrink-0 ml-2" />
                                        </SidebarMenuButton>
                                    </CollapsibleTrigger>
                                </SidebarMenuItem>
                                <div className="flex items-center pr-2">
                                     <Dialog open={isPageDialogOpen} onOpenChange={setIsPageDialogOpen}>
                                        <DialogTrigger asChild>
                                             <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setActiveBinderId(binder.id); setActiveNotebookId(notebook.id); }}>
                                                <PlusCircle className="h-4 w-4" />
                                            </Button>
                                        </DialogTrigger>
                                    </Dialog>
                                    <ItemMenu id={notebook.id} title={notebook.title} type="notebook" />
                                </div>
                            </div>
                          <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
                            <div className="pl-6">
                              {notebook.pages.map((page: Page) => (
                                <SidebarMenuItem key={page.id}>
                                   <div className="flex items-center group">
                                      <Link href={`/dashboard/${binder.id}/${notebook.id}/${page.id}`} className="flex-1">
                                        <SidebarMenuButton
                                          isActive={params.pageId === page.id}
                                        >
                                          <Icon name={page.icon} />
                                          <span className="truncate">{page.title}</span>
                                        </SidebarMenuButton>
                                      </Link>
                                      <div className="pr-2">
                                        <ItemMenu id={page.id} title={page.title} type="page" />
                                      </div>
                                  </div>
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

        <SidebarInset className="p-0 flex flex-col">
            <header className="flex items-center justify-between p-4 md:p-6 lg:p-8 border-b bg-background">
                <div className="flex items-center gap-4">
                    <SidebarTrigger>
                        <PanelLeft />
                    </SidebarTrigger>
                    <div>
                        <h1 className="text-2xl font-bold font-headline">{currentPage?.title || "Welcome"}</h1>
                        <p className="text-sm text-muted-foreground">{currentPage ? 'Select a page to start editing.' : 'What will you learn today?'}</p>
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
                        <Select onValueChange={(value: "document" | "diagram") => setNewItem({...newItem, type: value})} defaultValue={newItem.type}>
                             <SelectTrigger><SelectValue placeholder="Select a type" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="document"><FileText className="inline-block mr-2 h-4 w-4" /> Document</SelectItem>
                                <SelectItem value="diagram"><Network className="inline-block mr-2 h-4 w-4" /> Diagram</SelectItem>
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
        
        {/* Rename Dialog */}
        <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rename {renameTarget?.type}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <Label htmlFor="new-title">New Title</Label>
                        <Input id="new-title" value={newTitle} onChange={e => setNewTitle(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleRename}>Rename</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

      </div>
    </SidebarProvider>
  );
}
