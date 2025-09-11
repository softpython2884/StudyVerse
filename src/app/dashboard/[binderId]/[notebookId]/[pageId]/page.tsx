import { getPage } from "@/lib/data";
import { PageClient } from "./page-client";

export default async function Page({ params }: { params: { pageId: string } }) {
    const { pageId } = params;
    const page = await getPage(pageId);

    return <PageClient page={page} pageId={pageId} />;
}
