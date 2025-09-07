"use server";

import * as React from 'react';
import { getCurrentUser } from '@/lib/session';
import { DashboardPage } from '@/components/dashboard-page'; // Assuming this is where the layout structure is
import type { Page } from '@/lib/types';
import { mockData } from '@/lib/mock-data';

export default async function DashboardLayout({
  children,
  params
}: {
  children: React.ReactNode,
  params: { binderId?: string; notebookId?: string; pageId?: string };
}) {
  const user = await getCurrentUser();

  const getInitialPage = () => {
    if (params.binderId && params.notebookId && params.pageId) {
      const binder = mockData.find(b => b.id === params.binderId);
      const notebook = binder?.notebooks.find(n => n.id === params.notebookId);
      const page = notebook?.pages.find(p => p.id === params.pageId);
      return page || null;
    }
    return null;
  };
  
  const initialPage = getInitialPage();

  // The DashboardPage now acts as the layout, wrapping the children.
  // The actual page content will be passed as `children`.
  return (
    <DashboardPage user={user} initialActivePage={initialPage}>
        {children}
    </DashboardPage>
  );
}
