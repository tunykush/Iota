import { constants } from "node:crypto";
import { lookup } from "node:dns/promises";
import http from "node:http";
import https from "node:https";
import { isIP } from "node:net";
import type { SupabaseClient } from "@supabase/supabase-js";
import { stripHtml } from "@/lib/rag/ingestion";
import { ragServices } from "@/lib/rag/services";

export const CRAWL_TIMEOUT_MS = 25000;

const CRAWL_USER_AGENT =
  "Mozilla/5.0 (compatible; IotaBot/0.1; +https://iota.local) AppleWebKit/537.36";
const MAX_REDIRECTS = 5;

export function isValidHttpUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function isBlockedIpAddress(value: string): boolean {
  const normalized = value.replace(/^\[(.*)\]$/, "$1").toLowerCase();
  const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mappedIpv4) return isBlockedIpAddress(mappedIpv4[1]);

  if (isIP(normalized) === 4) {
    const octets = normalized.split(".").map(Number);
    if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) return true;
    const [a, b] = octets;

    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && (b === 0 || b === 168)) return true;
    if (a === 198 && (b === 18 || b === 19 || b === 51)) return true;
    if (a === 203 && b === 0) return true;
    if (a >= 224) return true;
    return false;
  }

  if (isIP(normalized) === 6) {
    if (normalized === "::" || normalized === "::1") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:")) return true;
    return false;
  }

  return false;
}

export function isBlockedPrivateUrl(raw: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(raw).hostname;
  } catch {
    return true; // Invalid URL — treat as blocked
  }
  const normalized = hostname.replace(/^\[(.*)\]$/, "$1").toLowerCase();

  // Exact matches
  if (normalized === "localhost" || normalized.endsWith(".localhost")) return true;
  if (isBlockedIpAddress(normalized)) return true;

  return false;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function collectMeaningfulStrings(value: unknown, output: string[], seen = new WeakSet<object>()) {
  if (typeof value === "string") {
    const text = stripHtml(decodeHtmlEntities(value));
    if (text.length >= 20 || /^https?:\/\//i.test(text)) output.push(text);
    return;
  }

  if (!value || typeof value !== "object") return;
  if (seen.has(value)) return;
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item) => collectMeaningfulStrings(item, output, seen));
    return;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (["title", "description", "body", "metaDescription", "categoryName", "tagName", "slug"].includes(key)) {
      collectMeaningfulStrings(nestedValue, output, seen);
      continue;
    }

    if (/Url$|url|link/i.test(key)) {
      collectMeaningfulStrings(nestedValue, output, seen);
    }
  }
}

export function extractNextDataText(html: string): string {
  const match = html.match(/<script[^>]+id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match?.[1]) return "";

  try {
    const data = JSON.parse(decodeHtmlEntities(match[1]));
    const strings: string[] = [];
    collectMeaningfulStrings(data?.props?.pageProps ?? data, strings);
    return Array.from(new Set(strings)).join("\n\n");
  } catch {
    return "";
  }
}

export function extractWebsiteText(html: string): string {
  const visibleText = stripHtml(html);
  if (visibleText.length >= 50) return visibleText;

  const nextDataText = extractNextDataText(html);
  if (nextDataText.length >= 20) return nextDataText;

  throw new Error("Could not extract meaningful text from the website (page may be empty, JavaScript-rendered, or require authentication)");
}

async function assertPublicHttpUrl(raw: string) {
  if (!isValidHttpUrl(raw) || isBlockedPrivateUrl(raw)) {
    throw new Error("URL points to a private, reserved, or non-http address");
  }

  const hostname = new URL(raw).hostname.replace(/^\[(.*)\]$/, "$1");
  if (isIP(hostname)) return;

  const addresses = await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some((address) => isBlockedIpAddress(address.address))) {
    throw new Error("URL resolves to a private or reserved address");
  }
}

function getFetchFailureCode(error: unknown): string | undefined {
  if (!(error instanceof Error)) return undefined;
  const cause = error.cause as { code?: string } | undefined;
  return cause?.code;
}

async function requestWithNodeHttp(
  url: string,
  allowLegacyTls = false,
  redirectCount = 0,
): Promise<{ status: number; text: string; finalUrl: string }> {
  await assertPublicHttpUrl(url);

  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const isHttps = parsed.protocol === "https:";
    const client = isHttps ? https : http;
    const request = client.request(
      parsed,
      {
        method: "GET",
        timeout: CRAWL_TIMEOUT_MS,
        headers: {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9,vi;q=0.8",
          "user-agent": CRAWL_USER_AGENT,
        },
        secureOptions: allowLegacyTls ? constants.SSL_OP_LEGACY_SERVER_CONNECT : undefined,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const location = response.headers.location;

        if (location && status >= 300 && status < 400) {
          response.resume();
          const nextUrl = new URL(location, parsed).toString();
          if (redirectCount >= MAX_REDIRECTS) {
            reject(new Error("Website redirected too many times"));
            return;
          }
          requestWithNodeHttp(nextUrl, allowLegacyTls, redirectCount + 1).then(resolve).catch(reject);
          return;
        }

        response.setEncoding("utf8");
        let text = "";
        response.on("data", (chunk) => {
          text += chunk;
        });
        response.on("end", () => resolve({ status, text, finalUrl: url }));
      },
    );

    request.on("timeout", () => request.destroy(new Error(`Website request timed out after ${CRAWL_TIMEOUT_MS / 1000}s`)));
    request.on("error", reject);
    request.end();
  });
}

function assertSuccessfulWebsiteResponse(status: number, finalUrl: string) {
  if (status < 200 || status >= 300) {
    throw new Error(`Website returned HTTP ${status} for ${finalUrl}`);
  }
}

export async function fetchWebsiteHtml(url: string): Promise<string> {
  try {
    await assertPublicHttpUrl(url);
    const pageResponse = await fetch(url, {
      redirect: "manual",
      headers: {
        "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9,vi;q=0.8",
        "user-agent": CRAWL_USER_AGENT,
      },
      signal: AbortSignal.timeout(CRAWL_TIMEOUT_MS),
    });

    if (pageResponse.status >= 300 && pageResponse.status < 400) {
      const location = pageResponse.headers.get("location");
      if (!location) throw new Error(`Website returned ${pageResponse.status}`);
      const redirectedUrl = new URL(location, url).toString();
      await assertPublicHttpUrl(redirectedUrl);
      const redirectedResponse = await requestWithNodeHttp(redirectedUrl);
      assertSuccessfulWebsiteResponse(redirectedResponse.status, redirectedResponse.finalUrl);
      return redirectedResponse.text;
    }

    assertSuccessfulWebsiteResponse(pageResponse.status, pageResponse.url || url);

    return pageResponse.text();
  } catch (error) {
    // Only retry with Node.js HTTP for network/TLS errors, not HTTP status or validation errors
    const fetchCode = getFetchFailureCode(error);
    const isNetworkError = error instanceof TypeError || Boolean(fetchCode);
    if (!isNetworkError) throw error;

    const allowLegacyTls = fetchCode === "ERR_SSL_UNSAFE_LEGACY_RENEGOTIATION_DISABLED";
    const pageResponse = await requestWithNodeHttp(url, allowLegacyTls);

    assertSuccessfulWebsiteResponse(pageResponse.status, pageResponse.finalUrl);

    return pageResponse.text;
  }
}

export async function ingestWebsiteDocument(input: {
  supabase: SupabaseClient;
  userId: string;
  documentId: string;
  jobId: string;
  url: string;
  crawlDepth?: number;
}): Promise<number> {
  try {
    await input.supabase
      .from("documents")
      .update({ status: "processing", error_message: null, chunk_count: 0 })
      .eq("id", input.documentId)
      .eq("user_id", input.userId);

    await input.supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", input.documentId)
      .eq("user_id", input.userId);

    const html = await fetchWebsiteHtml(input.url);
    const text = extractWebsiteText(html);
    return await ragServices.ingestion.ingestDocumentText({
      supabase: input.supabase,
      userId: input.userId,
      documentId: input.documentId,
      jobId: input.jobId,
      sourceType: "website",
      text,
      url: input.url,
      metadata: { crawlDepth: input.crawlDepth ?? 0, extractedFrom: input.url },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to ingest website";
    await ragServices.ingestion.markFailed({
      supabase: input.supabase,
      userId: input.userId,
      documentId: input.documentId,
      jobId: input.jobId,
      message,
    });
    throw error;
  }
}
