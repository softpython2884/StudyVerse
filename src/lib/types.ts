export type Page = {
  id: string;
  title: string;
  icon: string;
  type: 'document' | 'diagram';
  content?: string | null;
};

export type Notebook = {
  id: string;
  title: string;
  icon: string;
  color: string;
  tags: string[];
  pages: Page[];
};

export type Binder = {
  id: string;
  title: string;
  icon: string;
  notebooks: Notebook[];
};

export interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
}
