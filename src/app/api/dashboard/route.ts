// GET /api/dashboard  — aggregated stats + recent items for the overview page

import { NextResponse } from "next/server";
import {
  mockDocuments,
  mockConversations,
  mockDashboardStats,
  simulateDelay,
} from "@/lib/api/mock-db";
import type { DashboardResponse } from "@/lib/api/types";

export async function GET() {
  await simulateDelay(300);

  // Recompute live stats from mock store so uploads/deletes are reflected
  const readyDocs = mockDocuments.filter((d) => d.status === "ready");
  const processingDocs = mockDocuments.filter((d) => d.status === "processing");
  const totalChunks = mockDocuments.reduce((sum, d) => sum + d.chunkCount, 0);

  const recentDocuments = [...mockDocuments]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const recentConversations = [...mockConversations]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  const body: DashboardResponse = {
    stats: {
      ...mockDashboardStats,
      documentCount: readyDocs.length + processingDocs.length,
      processingCount: processingDocs.length,
      chunkCount: totalChunks,
    },
    recentDocuments,
    recentConversations,
  };

  return NextResponse.json(body);
}
