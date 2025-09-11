
export type Page = {
  id: string;
  title: string;
  icon: string;
  type: 'document' | 'diagram';
  content?: string | null;
  notebook_id?: string;
  isShared?: boolean;
  permission?: 'view' | 'edit';
  is_public?: boolean;
};

export type Notebook = {
  id: string;
  title: string;
  icon: string;
  color: string;
  tags: string[];
  pages: Page[];
  isShared?: boolean;
};

export type Binder = {
  id: string;
  title: string;
  icon: string;
  notebooks: Notebook[];
  isShared?: boolean;
};

export interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
}
