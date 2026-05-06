# Content Strategy

> **Owner**: @copywriter-seo
> **Personas**: Defined in `PRD.md`
> **Last updated**: 2026-05-06

---

## Overview

Private RAG Chatbot helps users turn their own PDFs, webpages, and structured records into a searchable AI assistant. All copy should reinforce trust, source grounding, and control over private knowledge.

**Primary value proposition**: Ask questions across your private documents and get grounded answers with sources.

**Canonical brand statement**: Your private knowledge, answered with citations.

---

## Brand Voice & Tone

### Voice

| Dimension | Setting | Description |
|-----------|---------|-------------|
| Formality | Conversational | Clear enough for students and non-technical teams |
| Energy | Medium | Helpful and confident without hype |
| Personality | Human | Knowledge work should feel approachable |
| Authority | Expert | The product must communicate trust and accuracy |

### Tone by Context

| Context | Tone | Example |
|---------|------|---------|
| Marketing headlines | Benefit-led and direct | Chat with your PDFs and websites, with sources attached |
| Error messages | Calm and specific | We could not extract readable text from this PDF. Try another file or enable OCR later. |
| Success confirmations | Brief and reassuring | Your document is ready to chat with. |
| Onboarding | Practical and jargon-light | Upload a PDF or add a URL to build your first knowledge base. |
| Empty states | Action-oriented | Add your first source to start asking grounded questions. |

### Voice Rules

- Lead with trustworthy answers, not AI hype.
- Use plain language for RAG concepts unless writing developer docs.
- Emphasize source citations and user control.
- Do not promise perfect accuracy.

### Forbidden Phrases

- "Knows everything" - conflicts with grounded retrieval behavior.
- "Never wrong" - overclaims model reliability.
- "Unlimited crawling" - not true for MVP scope.

---

## Target Personas

### Student Researcher

**Job-to-be-done**: Understand and summarize course PDFs without losing the source page.
**Biggest objection**: The chatbot might invent answers or miss assignment-specific details.
**Language to use**: PDFs, lecture notes, rubrics, sources, page references.
**Tone for this persona**: Helpful and direct.
**Primary CTA for this persona**: Upload a PDF.

### Knowledge Team Member

**Job-to-be-done**: Ask questions across internal documents and web content quickly.
**Biggest objection**: Private information might not be isolated or trustworthy.
**Language to use**: knowledge base, policies, reports, source links, team documents.
**Tone for this persona**: Reliable and professional.
**Primary CTA for this persona**: Add your knowledge sources.

### Developer / Admin

**Job-to-be-done**: Configure a secure, observable, provider-agnostic RAG system.
**Biggest objection**: The architecture might lock them into one model or vector store.
**Language to use**: pgvector, embeddings, retrieval, LLM provider, ingestion jobs.
**Tone for this persona**: Technical and concise.
**Primary CTA for this persona**: Review the architecture.

---

## Keyword Strategy

### Domain & Canonical URL

- **Primary domain**: TBD
- **Canonical protocol + www preference**: TBD

### Primary Keyword Targets

| Keyword | Intent | Mapped Page | Monthly Volume | Difficulty | Status | Date Added |
|---------|--------|-------------|----------------|------------|--------|------------|
| AI PDF chatbot | Commercial | `/` | verify | verify | planned | 2026-05-06 |
| RAG chatbot | Informational/commercial | `/rag-chatbot` | verify | verify | planned | 2026-05-06 |
| chat with PDF | Commercial | `/chat-with-pdf` | verify | verify | planned | 2026-05-06 |
| private knowledge base AI | Commercial | `/private-knowledge-base-ai` | verify | verify | planned | 2026-05-06 |

---

## Page Copy Library

Copy is recorded here after it goes live.

### Homepage

**Title tag**: Private RAG Chatbot - Chat With Your PDFs and Websites
**Meta description**: Build a private AI chatbot over PDFs, crawled websites, and database knowledge with grounded answers and source citations.

**H1**:
> Your private knowledge, answered with citations.

**Sub-headline**:
> Upload PDFs, add URLs, and ask questions. The assistant retrieves relevant context before answering and tells you when the source data is not enough.

**Primary CTA**: Upload a PDF
**Secondary CTA**: Add a website URL

---

## Technical SEO Decisions

| Tag | Default value | Notes |
|-----|---------------|-------|
| robots | `index, follow` | Override to `noindex` for app-private and admin routes |
| og:image | TBD | Create once branding is defined |
| twitter:card | `summary_large_image` | Default social card |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-06 | Initial content strategy for RAG chatbot |
