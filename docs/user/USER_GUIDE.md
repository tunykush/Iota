<!--
DOCUMENT METADATA
Owner: @documentation-writer
Update trigger: Any user-facing feature is added, changed, or removed
Update scope: Full document
Read by: @qa-engineer
-->

# Private RAG Chatbot - User Guide

> Last updated: 2026-05-06
> Version: 1.0

---

## Getting Started

Private RAG Chatbot helps you ask questions about documents and web pages you provide. It does not automatically know everything in the world; it works best after you upload or ingest the sources you want it to use.

---

## Uploading a PDF

1. Open the Documents or Upload screen.
2. Choose a PDF file.
3. Start the upload.
4. Wait for the status to change from processing to ready.
5. Ask questions about the document in chat.

**What to expect**: The system extracts text, splits it into chunks, creates embeddings, and stores page numbers so answers can cite the PDF.

### Common Issues

**The PDF has no useful text**
The file may be scanned images instead of selectable text. OCR is not included in the v1 scope unless the product owner adds it.

**Ingestion failed**
The file may be too large, corrupt, encrypted, or unsupported. Try another PDF or check the ingestion error.

---

## Crawling a Website

1. Open the Crawl URL screen.
2. Paste a URL.
3. Submit the crawl job.
4. Wait for the source to become ready.
5. Ask questions about the crawled page.

**What to expect**: The system fetches readable page content, removes boilerplate, chunks the text, and stores the source URL for citations.

### Common Issues

**The website blocks crawling**
Some websites block automated access or require login. The crawler will show a failed status if it cannot access the content.

**The answer misses parts of a website**
The MVP is planned around single-page ingestion first. Depth-limited multi-page crawling is an open product decision.

---

## Asking Questions

1. Open the Chat screen.
2. Type a question in Vietnamese or another language.
3. Optionally select specific documents to search.
4. Send the message.
5. Review the answer and sources.

The assistant should answer from retrieved sources only. If it cannot find enough information, it should say that the data provided does not contain the answer.

---

## Reading Citations

Each grounded answer may include a source list. Sources can point to:

- PDF title and page number.
- Website title and URL.
- Structured database source and record ID.

Use citations to verify important claims.

---

## Managing Documents

The Documents screen should let you:

- See all ingested PDFs, websites, and database sources.
- Filter by source type or status.
- Check chunk count and ingestion status.
- Delete a document and its associated chunks and embeddings.

Deleting a document removes it from future retrieval.

---

## FAQ

**Q: Can the chatbot answer questions outside my uploaded data?**
A: It should not. The product requirement is to answer only from retrieved context and refuse unsupported questions.

**Q: Can I use local models instead of OpenAI?**
A: The architecture plans for OpenAI as the default provider and an Ollama-compatible path for local LLMs.

**Q: Will it support scanned PDFs?**
A: OCR is out of scope for v1 unless the product owner decides to add it.
