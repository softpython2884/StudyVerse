import { Editor } from "@/components/editor";
import { DiagramEditor } from "@/components/diagram-editor";
import { getPage } from "@/lib/data";


export default async function Page({ params }: { params: { pageId: string } }) {
    const { pageId } = params;

    const page = await getPage(pageId);

    return (
        <>
            {page ? (
                page.type === 'diagram' ? (
                    <DiagramEditor key={pageId} page={page} />
                ) : (
                    <Editor key={pageId} page={page} />
                )
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Page not found.</p>
                </div>
            )}
        </>
    );
}
