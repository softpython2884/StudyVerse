
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
  permission?: 'view' | 'edit';
};

export type Binder = {
  id: string;
  title: string;
  icon: string;
  notebooks: Notebook[];
  isShared?: boolean;
  permission?: 'view' | 'edit';
};

export interface User {
  id: number;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Notification {
    id: number;
    user_id: number;
    content: string;
    link?: string;
    is_read: boolean;
    created_at: string;
}
