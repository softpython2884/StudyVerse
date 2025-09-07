import { Editor } from "@/components/editor";
import { mockData } from "@/lib/mock-data";

export default function Page({ params }: { params: { binderId: string, notebookId: string, pageId: string } }) {
    const { binderId, notebookId, pageId } = params;

    const binder = mockData.find(b => b.id === binderId);
    const notebook = binder?.notebooks.find(n => n.id === notebookId);
    const page = notebook?.pages.find(p => p.id === pageId);

    return (
        <>
            {page ? (
                <Editor key={`${binderId}-${notebookId}-${pageId}`} page={page} />
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Page not found.</p>
                </div>
            )}
        </>
    );
}
