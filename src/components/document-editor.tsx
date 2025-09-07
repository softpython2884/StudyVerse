"use client";

import * as React from "react";
import type { Page } from "@/lib/types";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Pilcrow,
  Heading1,
  Heading2,
  Code,
  Quote,
  Undo,
  Redo,
  Printer,
  ChevronLeft,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";


interface DocumentEditorProps {
  page: Page;
}

const sampleContent = `<h1>Titre Principal</h1>
<h2>Sous-titre</h2>
<p>Ceci est un paragraphe de texte. Il peut contenir <b>du gras</b>, <i>de l'italique</i>, ou même <code>du code inline</code>.</p>
<hr/>
<h3>Liste à puces</h3>
<ul>
  <li>Élément 1</li>
  <li>Élément 2</li>
  <li>Élément 3</li>
</ul>
<h3>Liste numérotée</h3>
<ol>
  <li>Première étape</li>
  <li>Deuxième étape</li>
  <li>Troisième étape</li>
</ol>
<h3>Citation</h3>
<blockquote>Ceci est une citation inspirante.</blockquote>
<h3>Lien</h3>
<p><a href="#" class="text-primary hover:underline">Visitez Microsoft Copilot</a></p>
<h3>Bloc de code</h3>
<pre><code class="language-python">def dire_bonjour():
  print("Bonjour, monde !")</code></pre>`;

const documentOutline = [
  { id: "1", level: 1, title: "Titre Principal" },
  { id: "2", level: 2, title: "Sous-titre" },
  { id: "3", level: 3, title: "Ceci est un paragraphe d..." },
  { id: "4", level: 3, title: "Liste à puces" },
  { id: "5", level: 4, title: "Élément 1" },
  { id: "6", level: 4, title: "Élément 2" },
  { id: "7", level: 4, title: "Élément 3" },
  { id: "8", level: 3, title: "Liste numérotée" },
];

export function DocumentEditor({ page }: DocumentEditorProps) {
  const [content, setContent] = React.useState(sampleContent);
  const [activeOutlineItem, setActiveOutlineItem] = React.useState("1");
  const editorRef = React.useRef<HTMLDivElement>(null);

  const handleFormat = (command: string, value?: string) => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand(command, false, value);
    }
  };

  const handleContentChange = () => {
    if (editorRef.current) {
      setContent(editorRef.current.innerHTML);
    }
  };

  return (
    <div className="flex h-full bg-secondary/30">
      {/* Document Outline Sidebar */}
      <aside className="w-64 bg-background p-4 border-r flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h3 className="font-semibold text-sm">Onglets du document</h3>
          <Button variant="ghost" size="icon">
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        <ul>
          {documentOutline.map((item) => (
            <li key={item.id} className="mb-1">
              <button
                onClick={() => setActiveOutlineItem(item.id)}
                className={cn(
                  "w-full text-left text-sm rounded-md px-2 py-1.5 transition-colors",
                  activeOutlineItem === item.id
                    ? "bg-primary/10 text-primary font-semibold"
                    : "hover:bg-muted"
                )}
                style={{ paddingLeft: `${item.level * 0.75}rem` }}
              >
                {item.title}
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Editor */}
      <div className="flex-1 flex flex-col items-center p-8 overflow-y-auto">
        <div className="w-full max-w-4xl">
          {/* Toolbar */}
          <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm mb-4 p-2 border rounded-lg shadow-sm flex items-center gap-1 flex-wrap">
            <Button variant="ghost" size="icon" onClick={() => handleFormat("undo")}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleFormat("redo")}>
              <Redo className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Select
              defaultValue="p"
              onValueChange={(value) => handleFormat("formatBlock", `<${value}>`)}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Style" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="p">
                  <div className="flex items-center gap-2">
                    <Pilcrow className="h-4 w-4" /> Paragraphe
                  </div>
                </SelectItem>
                <SelectItem value="h1">
                  <div className="flex items-center gap-2">
                    <Heading1 className="h-4 w-4" /> Titre 1
                  </div>
                </SelectItem>
                <SelectItem value="h2">
                  <div className="flex items-center gap-2">
                    <Heading2 className="h-4 w-4" /> Titre 2
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button variant="ghost" size="icon" onClick={() => handleFormat("bold")}>
              <Bold className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleFormat("italic")}>
              <Italic className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleFormat("underline")}>
              <Underline className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-1" />
            <Button variant="ghost" size="icon" onClick={() => handleFormat("insertUnorderedList")}>
              <List className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleFormat("insertOrderedList")}>
              <ListOrdered className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleFormat("formatBlock", "<blockquote>")}>
              <Quote className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleFormat("formatBlock", "<pre>")}>
              <Code className="h-4 w-4" />
            </Button>
          </div>

          {/* Editable Content */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            className="prose dark:prose-invert max-w-none w-full bg-background p-12 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
            onInput={handleContentChange}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        </div>
      </div>
    </div>
  );
}
