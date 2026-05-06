<!--
DOCUMENT METADATA
Owner: @ui-ux-designer
Update trigger: Design tokens, component specs, interaction patterns, key user flows, or accessibility baseline changes
Update scope:
  @ui-ux-designer: Entire document
  Other agents: read-only. Do not modify design decisions or specifications.
Read by: All agents implementing or testing UI.
-->

# Design System and UX Specifications

> Last updated: 2026-05-06
> Version: 1.0

This product should feel like a focused knowledge workspace: calm, efficient, source-aware, and built for repeated use. Avoid marketing-style layouts inside the authenticated app. Prioritize clear document status, readable chat answers, and fast citation inspection.

---

## Key User Flows

| Flow | Goal | Primary entry | Notes |
|------|------|---------------|-------|
| Upload PDF | Add private PDF knowledge | Documents or upload screen | Supports FR-010 to FR-014 |
| Crawl URL | Add website content | Crawl URL form | Supports FR-020 to FR-023 |
| Ask question | Get grounded answer with citations | Chat screen | Supports FR-050 to FR-056 |
| Manage documents | See, filter, and delete sources | Documents screen | Supports FR-040 to FR-042 |
| Inspect citations | Verify answer support | Citation panel in chat | Supports FR-054 |

---

## Color Tokens

Final visual tokens are TBD. Use accessible contrast and avoid a one-note palette.

| Token | Value | Usage |
|-------|-------|-------|
| `color-primary-500` | TBD | Primary actions and active states |
| `color-primary-600` | TBD | Hover states |
| `color-neutral-50` | TBD | App background |
| `color-neutral-900` | TBD | Body text |
| `color-error-500` | TBD | Failed ingestion, validation errors |
| `color-success-500` | TBD | Successful ingestion |
| `color-warning-500` | TBD | Processing and partial extraction states |

---

## Typography Scale

| Token | Size | Weight | Usage |
|-------|------|--------|-------|
| `text-heading-1` | 28px | 700 | Main page headings |
| `text-heading-2` | 22px | 600 | Section headings |
| `text-body` | 16px | 400 | Chat content and forms |
| `text-small` | 14px | 400 | Metadata, citations, helper text |
| `text-code` | 14px | 400 | Technical snippets and source excerpts |

---

## Component Inventory

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| AppShell | `apps/web/src/components/layout/AppShell` | Planned | Sidebar/nav plus main workspace |
| ChatComposer | `apps/web/src/components/chat/ChatComposer` | Planned | Message input and submit action |
| MessageList | `apps/web/src/components/chat/MessageList` | Planned | User/assistant message timeline |
| CitationPanel | `apps/web/src/components/chat/CitationPanel` | Planned | Shows source title, page/URL, snippet |
| DocumentList | `apps/web/src/components/documents/DocumentList` | Planned | Filterable source list |
| UploadDropzone | `apps/web/src/components/ingestion/UploadDropzone` | Planned | PDF upload with validation |
| CrawlUrlForm | `apps/web/src/components/ingestion/CrawlUrlForm` | Planned | URL input and crawl status |
| JobStatusBadge | `apps/web/src/components/ingestion/JobStatusBadge` | Planned | Queued/running/succeeded/failed |

---

## Interaction Patterns

- **Loading states**: Chat answers should stream or show a compact pending state. Ingestion should show persistent job status.
- **Error states**: Failed ingestion must show a safe error message and next action.
- **Empty states**: Empty document list should make upload/crawl actions immediately available.
- **Citations**: Citation controls should be visible near the answer, with source details available in a side panel or inline expansion.
- **Destructive actions**: Deleting a document requires confirmation and must explain that chunks and embeddings will also be removed.
- **Accessibility**: Core chat, upload, crawl, document filtering, and delete flows must work by keyboard.
