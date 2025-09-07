export type Page = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  type: 'course' | 'note';
};

export type Notebook = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  tags: string[];
  pages: Page[];
};

export type Binder = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  notebooks: Notebook[];
};
