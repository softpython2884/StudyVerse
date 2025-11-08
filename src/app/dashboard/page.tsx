
"use client"

import { WelcomePage } from "@/components/welcome-page";
import { useDashboard } from "@/components/dashboard-page";


export default function DashboardRootPage() {
  const { openNewBinderDialog, openNewNotebookDialog, openNewPageDialog } = useDashboard();

  return <WelcomePage 
    onNewBinder={openNewBinderDialog}
    onNewNotebook={openNewNotebookDialog}
    onNewPage={openNewPageDialog}
  />;
}
