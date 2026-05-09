# 🐛 Iota Source Code Bug Report

> Generated from full source code review — 2026-05-10

---

## 🔴 CRITICAL — Security & Data Integrity

### 1. SSRF Protection Bypass in `isBlockedPrivateUrl`
**File:** `src/lib/rag/website-ingestion.ts` lines 23–29  
**Severity:** 🔴 Critical (Security)

The SSRF blocklist has multiple bypass vectors:

```ts
const blockedPatterns = ["localhost", "127.", "0.", "169.254.", "10.", "192.168.", "::1", "fc", "fd", "fe80:"];
if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(normalized)) return true;
return blockedPatterns.some((p) => normalized.startsWith(p) || normalized === p.replace(".", ""));
```

**Problems:**
- `p.replace(".", "")` only removes the FIRST dot — `"127."` becomes `"127"`, `"192.168."` becomes `"192168."`. The `===` check is nonsensical for multi-dot patterns.
- Does NOT block `0.0.0.0` (starts with `"0."` ✓ but `0x7f000001`, decimal `2130706433`, or octal `0177.0.0.1` bypass it).
- IPv6-mapped IPv4 like `::ffff:127.0.0.1` or `::ffff:10.0.0.1` are NOT blocked.
- `[::1]` — brackets are stripped, but `fc` prefix check would match `facebook.com` (false positive!).
- `isBlockedPrivateUrl` is exported and calls `new URL(raw)` which throws on invalid URLs, but it's called independently without prior `isValidHttpUrl` check in some paths.

**Fix:** Use a proper IP-parsing library or at minimum resolve the hostname to an IP and check against RFC 1918/5735/4193 ranges. Remove the broken `p.replace(".", "")` logic. Add `0.0.0.0`, IPv6-mapped addresses, and DNS rebinding protection.

---

### 2. Gemini API Key Leaked in URL Query Parameter
**File:** `src/lib/llm/providers/gemini.ts` line 33  
**Severity:** 🔴 Critical (Security)

```ts
const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${apiKey}`;
```

The API key is passed as a URL query parameter. This means:
- It appears in server access logs, proxy logs, CDN logs
- It may be cached by intermediate proxies
- It's visible in error stack traces and monitoring tools

**Fix:** This is Google's official API pattern for Gemini, so it's "by design" from Google's side. However, consider using the `x-goog-api-key` header instead (which Gemini also supports) to avoid log exposure:
```ts
headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey }
```

---

### 3. API Routes Missing Auth — Debug Endpoint Exposed
**File:** `src/app/api/debug/supabase/route.ts`  
**Severity:** 🔴 Critical (Security)

The debug endpoint exists and may expose internal Supabase configuration. The middleware (`src/middleware.ts`) only protects `/dashboard/*` routes — all `/api/*` routes must implement their own auth. Any API route that forgets auth is publicly accessible.

**Fix:** Verify the debug route has auth guards. Consider adding API-level auth middleware or removing debug endpoints in production.

---

## 🟠 HIGH — Functional Bugs

### 4. `apiFetch` Headers Overwritten by Spread
**File:** `src/lib/api/client.ts` lines 32–35  
**Severity:** 🟠 High (Latent bug)

```ts
const res = await fetch(url, {
    headers: isFormData ? init?.headers : { "Content-Type": "application/json", ...init?.headers },
    ...init,  // ← This overwrites the `headers` above if init has headers
});
```

`...init` is spread AFTER `headers`, so if `init` contains a `headers` property, it completely overwrites the merged headers object (losing `Content-Type`). Currently no caller triggers this, but any future call with custom headers on a JSON request will silently lose `Content-Type`.

**Fix:**
```ts
const { headers: initHeaders, ...restInit } = init ?? {};
const res = await fetch(url, {
    headers: isFormData ? initHeaders : { "Content-Type": "application/json", ...initHeaders },
    ...restInit,
});
```

---

### 5. `useChat` — `sending` in Dependency Array Causes Stale Closure
**File:** `src/hooks/useChat.ts` line 157  
**Severity:** 🟠 High (UX bug)

```ts
const sendMessage = useCallback(async (...) => {
    if (!text.trim() || sending) return;  // guard
    // ...
}, [conversationId, sending]);  // ← `sending` causes re-creation on every send
```

Including `sending` in the dependency array means `sendMessage` gets a new reference every time `sending` toggles (true→false→true). This causes:
- Unnecessary re-renders in any component that depends on `sendMessage` identity
- Potential race conditions if a component captures the old `sendMessage` reference

The `sending` guard inside the function body is sufficient. Use a ref instead:

**Fix:**
```ts
const sendingRef = useRef(false);
// Inside sendMessage: if (sendingRef.current) return;
// Remove `sending` from deps array
```

---

### 6. Embedding Provider Recreated on Every Call
**File:** `src/lib/embeddings/index.ts` lines 40–49  
**Severity:** 🟠 High (Performance)

```ts
export async function embedTexts(texts: string[]) {
    const provider = createEmbeddingProvider();  // ← new instance every call
    // ...
}
```

`createEmbeddingProvider()` is called on every `embedTexts` invocation. For the `local` provider, this re-initializes the embedding pipeline each time. For `openai-compatible`, it creates a new config object. During ingestion of a large document with many chunks, this is called repeatedly.

**Fix:** Cache the provider as a module-level singleton:
```ts
let _cachedProvider: EmbeddingProvider | null = null;
function getProvider() {
    return _cachedProvider ??= createEmbeddingProvider();
}
```

---

### 7. `extractWebsiteText` Falls Back Silently to Empty String
**File:** `src/lib/rag/website-ingestion.ts` lines 83–88  
**Severity:** 🟠 High (Data quality)

```ts
export function extractWebsiteText(html: string): string {
    const visibleText = stripHtml(html);
    if (visibleText.length >= 50) return visibleText;
    return extractNextDataText(html);  // may return ""
}
```

If `stripHtml` returns < 50 chars AND the page has no `__NEXT_DATA__`, the function returns `""`. This empty string is then passed to `ingestDocumentText` which will create zero chunks but may still mark the document as "ready" with `chunk_count: 0`. The user sees a "ready" document with no searchable content.

**Fix:** Throw an error or return a sentinel when no meaningful text is extracted, so the ingestion pipeline can mark the document as failed.

---

### 8. `fetchWebsiteHtml` — Catch-All Retries Non-Network Errors
**File:** `src/lib/rag/website-ingestion.ts` lines 197–204  
**Severity:** 🟠 High (Logic bug)

```ts
} catch (error) {
    const allowLegacyTls = getFetchFailureCode(error) === "ERR_SSL_UNSAFE_LEGACY_RENEGOTIATION_DISABLED";
    const pageResponse = await requestWithNodeHttp(url, allowLegacyTls);  // retries ALL errors
    // ...
}
```

The catch block retries with `requestWithNodeHttp` for ANY error from the first `fetch` attempt — including HTTP 4xx/5xx errors (thrown by `assertSuccessfulWebsiteResponse`), validation errors from `assertPublicHttpUrl`, and even programming errors. Only TLS errors should trigger the Node.js HTTP fallback.

**Fix:** Only catch and retry on network/TLS errors, not on HTTP status errors:
```ts
} catch (error) {
    if (error instanceof TypeError || getFetchFailureCode(error)) {
        // Network error — retry with Node HTTP
    } else {
        throw error;  // HTTP errors, validation errors — don't retry
    }
}
```

---

## 🟡 MEDIUM — Logic & Correctness Issues

### 9. `context-orchestrator` — `"fc"` Prefix Blocks `facebook.com`
**File:** `src/lib/rag/website-ingestion.ts` line 26  
**Severity:** 🟡 Medium (False positive)

The SSRF blocklist includes `"fc"` and `"fd"` to block IPv6 ULA addresses (`fc00::/7`). But the check uses `normalized.startsWith(p)`, so any hostname starting with "fc" or "fd" is blocked — including `facebook.com`, `fcc.gov`, `fdic.gov`, etc.

**Fix:** Only apply IPv6 prefix checks when the hostname contains `:` (indicating IPv6).

---

### 10. Dead Code — `userMsg` Created But Unused
**File:** `src/app/api/chat/route.ts` lines 132–137, 228  
**Severity:** 🟡 Medium (Code quality)

```ts
const userMsg: ConversationMessage = { ... };
// ... 90 lines later ...
void userMsg;  // suppress unused warning
```

The `userMsg` object is constructed with type coercion but never used. The `void` statement is a code smell indicating this was once used or planned to be used.

**Fix:** Remove the `userMsg` construction and the `void` statement.

---

### 11. `agentic-rag.ts` — Agentic Loop May Exceed Token Budget
**File:** `src/lib/rag/agentic-rag.ts`  
**Severity:** 🟡 Medium (Reliability)

The agentic RAG loop appends tool results to the message history on each iteration. With `MAX_ITERATIONS = 4`, the accumulated context can exceed the LLM's context window, causing truncation or API errors. There's no token counting or context window management.

**Fix:** Add token estimation and truncate/summarize intermediate results when approaching the context limit.

---

### 12. LLM Router — Module-Level Constants vs Runtime Env
**File:** `src/lib/llm/providers/groq.ts` lines 3–5, similar in all providers  
**Severity:** 🟡 Medium (Testing/Config)

```ts
const GROQ_BASE_URL = process.env.GROQ_BASE_URL ?? "https://api.groq.com/openai/v1";
const GROQ_MODEL = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
```

These are evaluated at module load time. In test environments where env vars are set dynamically, the providers will use stale values. The API keys are correctly read at call time inside `generate()` and `isConfigured()`, but the base URLs and model names are frozen.

**Fix:** Read these inside the factory function or use getters.

---

### 13. `useConversations` — `fetch` Shadows Global
**File:** `src/hooks/useChat.ts` line 226  
**Severity:** 🟡 Medium (Code quality / potential confusion)

```ts
const fetch = useCallback(async () => { ... }, []);
```

The local variable `fetch` shadows the global `fetch` API. While not a runtime bug (the global isn't used here), it can cause confusion and linting warnings.

**Fix:** Rename to `loadConversations` or `fetchConversations`.

---

### 14. `ingestion.ts` — `splitTextIntoChunks` May Produce Tiny Trailing Chunks
**File:** `src/lib/rag/ingestion.ts`  
**Severity:** 🟡 Medium (Data quality)

The text splitting logic can produce very small trailing chunks (< 100 chars) that contain insufficient context for meaningful retrieval. These low-quality chunks dilute search results.

**Fix:** Merge trailing chunks smaller than a minimum threshold with the previous chunk.

---

## 🟢 LOW — Minor Issues

### 15. `apiFetch` — `undefined as T` Type Unsafety
**File:** `src/lib/api/client.ts` line 37  
```ts
if (res.status === 204) return undefined as T;
```
This is a type lie — `T` could be any type, but `undefined` is returned. Callers expecting a typed response from a 204 endpoint will get `undefined` at runtime.

### 16. Middleware Matcher Doesn't Exclude `/api/*`
**File:** `src/middleware.ts` lines 64–74  
The middleware runs on API routes too, adding unnecessary Supabase session refresh overhead to every API call. API routes already create their own Supabase client.

### 17. `deleteConversation` in `useChat` Both Throws and Sets Error
**File:** `src/hooks/useChat.ts` lines 168–184  
The function sets `error` state AND re-throws the error. Callers must handle both patterns (try/catch AND checking `error` state), which is inconsistent.

### 18. No Request Size Limit on Chat Messages
**File:** `src/app/api/chat/route.ts`  
The `message` field has no length validation beyond being non-empty. A user could send an extremely long message that exceeds LLM context windows or causes memory issues.

### 19. `conversations.updated_at` Updated Twice Per Chat
**File:** `src/app/api/chat/route.ts` lines 126–130 and 211–215  
The conversation's `updated_at` is set twice in the same request — once after saving the user message and once after saving the assistant message. The first update is unnecessary.

---

## Summary

| Severity | Count | Key Areas |
|----------|-------|-----------|
| 🔴 Critical | 3 | SSRF bypass, API key exposure, unprotected debug endpoint |
| 🟠 High | 5 | Headers bug, React hook deps, perf, silent failures, retry logic |
| 🟡 Medium | 6 | False positives, dead code, token budget, env config, naming |
| 🟢 Low | 5 | Type safety, middleware scope, error handling patterns |
| **Total** | **19** | |