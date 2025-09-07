"use server";

import * as React from 'react';
import { getCurrentUser } from '@/lib/session';
import { DashboardPage } from '@/components/dashboard-page';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode,
}) {
  const user = await getCurrentUser();

  return (
    <DashboardPage user={user}>
        {children}
    </DashboardPage>
  );
}
