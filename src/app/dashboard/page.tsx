
import { redirect } from 'next/navigation';
import { mockData } from '@/lib/mock-data';

export default function DashboardRootPage() {
  // Redirect to the first available page
  if (mockData.length > 0 && mockData[0].notebooks.length > 0 && mockData[0].notebooks[0].pages.length > 0) {
    const firstBinder = mockData[0];
    const firstNotebook = firstBinder.notebooks[0];
    const firstPage = firstNotebook.pages[0];
    redirect(`/dashboard/${firstBinder.id}/${firstNotebook.id}/${firstPage.id}`);
  }

  // Fallback if there is no content
  return (
    <div className="flex h-full items-center justify-center">
      <p className="text-muted-foreground">No content available. Create a new page to get started.</p>
    </div>
  );
}
