import type { Binder } from "./types";

export const mockData: Binder[] = [
  {
    id: "binder-1",
    title: "Fall Semester 2024",
    icon: "FolderKanban",
    notebooks: [
      {
        id: "notebook-1-1",
        title: "Advanced AI",
        icon: "BookOpen",
        color: "bg-blue-300",
        tags: ["CS", "AI", "Hard"],
        pages: [
          { id: "page-1-1-1", title: "Lecture 1: Intro", icon: "FileText", type: 'course' },
          { id: "page-1-1-2", title: "My Study Notes", icon: "StickyNote", type: 'note' },
        ],
      },
      {
        id: "notebook-1-2",
        title: "Literary Analysis",
        icon: "BookOpen",
        color: "bg-yellow-300",
        tags: ["Humanities", "Reading"],
        pages: [
          { id: "page-1-2-1", title: "Course Overview", icon: "FileText", type: 'course' },
        ],
      },
    ],
  },
  {
    id: "binder-2",
    title: "Spring Semester 2025",
    icon: "FolderKanban",
    notebooks: [
      {
        id: "notebook-2-1",
        title: "Quantum Physics",
        icon: "BookOpen",
        color: "bg-green-300",
        tags: ["Science", "Physics"],
        pages: [
          { id: "page-2-1-1", title: "Syllabus", icon: "FileText", type: 'course' },
          { id: "page-2-1-2", title: "Chapter 1 Notes", icon: "StickyNote", type: 'note' },
          { id: "page-2-1-3", title: "Chapter 2 Notes", icon: "StickyNote", type: 'note' },
        ],
      },
    ],
  },
];
