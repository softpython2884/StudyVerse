import { DashboardPage } from "@/components/dashboard-page";
import { mockData } from "@/lib/mock-data";

export default function Dashboard({ params }: { params: { binderId: string, notebookId: string, pageId: string } }) {
    const { binderId, notebookId, pageId } = params;

    const binder = mockData.find(b => b.id === binderId);
    const notebook = binder?.notebooks.find(n => n.id === notebookId);
    const page = notebook?.pages.find(p => p.id === pageId);

    const activePage = page ? {
        ...page,
        notebook,
        binder,
    } : null;

    return <DashboardPage initialActivePage={activePage} />;
}
