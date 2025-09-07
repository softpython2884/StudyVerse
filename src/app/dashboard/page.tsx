"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { mockData } from "@/lib/mock-data";

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the first available page
    if (mockData.length > 0 && mockData[0].notebooks.length > 0 && mockData[0].notebooks[0].pages.length > 0) {
      const firstBinder = mockData[0];
      const firstNotebook = firstBinder.notebooks[0];
      const firstPage = firstNotebook.pages[0];
      router.replace(`/dashboard/${firstBinder.id}/${firstNotebook.id}/${firstPage.id}`);
    }
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p>Loading your dashboard...</p>
    </div>
  );
}
