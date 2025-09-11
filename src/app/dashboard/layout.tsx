"use server";

import * as React from 'react';
import { DashboardPage } from '@/components/dashboard-page';
import { protectedRoute } from '@/lib/session';
import { getBinders, getNotifications } from '@/lib/data';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode,
}) {
  const user = await protectedRoute();
  const binders = await getBinders(user.id);
  const notifications = await getNotifications(user.id);

  return (
    <DashboardPage user={user} initialData={binders} initialNotifications={notifications}>
        {children}
    </DashboardPage>
  );
}
