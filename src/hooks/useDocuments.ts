// ─── useDocuments hooks ────────────────────────────────────────
// All document-related data fetching and mutations.
// Uses native React state + useEffect (no extra deps needed).
// Swap for React Query / SWR when the team decides on a server-state library.

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { documentsApi, ingestionJobsApi } from "@/lib/api/client";
import type {
  Document,
  DocumentListParams,
  IngestionJob,
  UploadPdfResponse,
  CrawlUrlRequest,
  CrawlUrlResponse,
} from "@/lib/api/types";

// ─── useDocuments — list ───────────────────────────────────────
export function useDocuments(params?: DocumentListParams) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await documentsApi.list(params);
      setDocuments(data.documents);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, [params?.sourceType, params?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { documents, total, loading, error, refetch: fetch };
}

// ─── useDocument — single ──────────────────────────────────────
export function useDocument(documentId: string | null) {
  const [document, setDocument] = useState<Document | null>(null);
  const [job, setJob] = useState<IngestionJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!documentId) return;
    setLoading(true);
    setError(null);
    documentsApi
      .get(documentId)
      .then(({ document: doc, job: j }) => {
        setDocument(doc);
        setJob(j);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load document"))
      .finally(() => setLoading(false));
  }, [documentId]);

  return { document, job, loading, error };
}

// ─── useUploadPdf ──────────────────────────────────────────────
export function useUploadPdf() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<UploadPdfResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (file: File, title?: string) => {
    setUploading(true);
    setProgress(0);
    setError(null);
    setResult(null);

    // Simulate upload progress (real XHR progress events would replace this)
    const progressInterval = setInterval(() => {
      setProgress((p) => Math.min(p + 15, 85));
    }, 200);

    try {
      const data = await documentsApi.uploadPdf(file, title);
      clearInterval(progressInterval);
      setProgress(100);
      setResult(data);
      return data;
    } catch (err) {
      clearInterval(progressInterval);
      setProgress(0);
      const msg = err instanceof Error ? err.message : "Upload failed";
      setError(msg);
      throw err;
    } finally {
      setUploading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setUploading(false);
    setProgress(0);
    setResult(null);
    setError(null);
  }, []);

  return { upload, uploading, progress, result, error, reset };
}

// ─── useCrawlUrl ───────────────────────────────────────────────
export function useCrawlUrl() {
  const [crawling, setCrawling] = useState(false);
  const [result, setResult] = useState<CrawlUrlResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const crawl = useCallback(async (body: CrawlUrlRequest) => {
    setCrawling(true);
    setError(null);
    setResult(null);
    try {
      const data = await documentsApi.crawlUrl(body);
      setResult(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Crawl failed";
      setError(msg);
      throw err;
    } finally {
      setCrawling(false);
    }
  }, []);

  const reset = useCallback(() => {
    setCrawling(false);
    setResult(null);
    setError(null);
  }, []);

  return { crawl, crawling, result, error, reset };
}

// ─── useDeleteDocument ─────────────────────────────────────────
export function useDeleteDocument() {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deleteDocument = useCallback(async (documentId: string) => {
    setDeleting(documentId);
    setError(null);
    try {
      await documentsApi.delete(documentId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      setError(msg);
      throw err;
    } finally {
      setDeleting(null);
    }
  }, []);

  return { deleteDocument, deleting, error };
}

// ─── useRetryDocumentIngestion ─────────────────────────────────
export function useRetryDocumentIngestion() {
  const [retrying, setRetrying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const retryDocument = useCallback(async (documentId: string) => {
    setRetrying(documentId);
    setError(null);
    try {
      return await documentsApi.retryIngestion(documentId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Retry failed";
      setError(msg);
      throw err;
    } finally {
      setRetrying(null);
    }
  }, []);

  return { retryDocument, retrying, error };
}

// ─── useJobPolling — poll ingestion job until terminal state ───
export function useJobPolling(jobId: string | null, intervalMs = 2000) {
  const [job, setJob] = useState<IngestionJob | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!jobId) return;

    const poll = async () => {
      try {
        const data = await ingestionJobsApi.get(jobId);
        setJob(data);
        if (data.status === "succeeded" || data.status === "failed") {
          stop();
        }
      } catch {
        stop();
      }
    };

    poll();
    intervalRef.current = setInterval(poll, intervalMs);

    return stop;
  }, [jobId, intervalMs, stop]);

  return { job, stopPolling: stop };
}
