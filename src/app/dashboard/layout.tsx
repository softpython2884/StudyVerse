"use server";

import * as React from 'react';
import { DashboardPage } from '@/components/dashboard-page';
import { getCurrentUser } from '@/lib/user';

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
