import assert from "node:assert/strict";
import {
  buildExtractiveAnswer,
  buildLocalAnswerPlan,
  calculateLocalConfidence,
  detectLocalIntent,
  expandLocalQuery,
  groupEvidenceBySourceAndMeaning,
} from "./chat";
import type { RetrievedChunk } from "./retrieval";

const baseChunk: RetrievedChunk = {
  documentId: "doc-1",
  chunkId: "chunk-1",
  title: "Upload API notes",
  sourceType: "pdf",
  pageNumber: 2,
  score: 8,
  snippet: "Upload requires validation before the backend stores a file.",
  text: "Upload requires validation before the backend stores a file. First configure the upload endpoint, then validate the token and file type. If upload failed, the likely cause is a missing token or unsupported file type.",
};

const authChunk: RetrievedChunk = {
  documentId: "doc-2",
  chunkId: "chunk-2",
  title: "Authentication guide",
  sourceType: "website",
  url: "https://example.test/auth",
  score: 6,
  snippet: "Login uses the auth callback to exchange credentials.",
  text: "Login uses the auth callback to exchange credentials. Sign in and register flows are separate, whereas the callback handles session creation after authentication.",
};

const duplicateChunk: RetrievedChunk = {
  ...baseChunk,
  chunkId: "chunk-3",
  score: 5,
  text: "Upload requires validation before the backend stores a file. Upload requires validation before the backend stores a file.",
};

assert.equal(detectLocalIntent("lỗi upload failed fix sao?"), "troubleshooting");
assert.equal(detectLocalIntent("what is local fallback?"), "definition");
assert.equal(detectLocalIntent("cách setup upload API"), "how_to");
assert.equal(detectLocalIntent("compare login vs register"), "comparison");

assert.deepEqual(
  ["error", "bug", "issue", "failed"].every((term) => expandLocalQuery("lỗi đăng nhập").includes(term)),
  true,
);
assert.deepEqual(
  ["login", "sign in", "auth"].every((term) => expandLocalQuery("lỗi đăng nhập").includes(term)),
  true,
);
assert.deepEqual(
  ["grading", "assessment", "criteria", "marking guide"].every((term) => expandLocalQuery("rubric chấm điểm").includes(term)),
  true,
);

const evidence = groupEvidenceBySourceAndMeaning([
  {
    text: "Upload requires validation before the backend stores a file.",
    chunk: baseChunk,
    chunkIndex: 0,
    sentenceIndex: 0,
    score: 9,
    matchedKeywords: ["upload", "validation"],
    exactPhraseMatch: true,
  },
  {
    text: "Upload requires validation before the backend stores a file.",
    chunk: duplicateChunk,
    chunkIndex: 1,
    sentenceIndex: 0,
    score: 7,
    matchedKeywords: ["upload"],
    exactPhraseMatch: false,
  },
]);

assert.equal(evidence.length, 1);
assert.equal(calculateLocalConfidence("upload validation", evidence, 9), "high");
assert.equal(calculateLocalConfidence("unrelated invoice payment", [], 0), "low");
assert.equal(buildLocalAnswerPlan("cách upload", "how_to", evidence).includeSteps, true);
assert.equal(buildLocalAnswerPlan("compare login vs register", "comparison", evidence).includeComparisonTable, true);

const howToAnswer = buildExtractiveAnswer("cách upload file", [baseChunk, authChunk]);
assert.match(howToAnswer, /Locally, the safest flow is:/);
assert.match(howToAnswer, /\[1\]/);
assert.match(howToAnswer, /Nguồn ưu tiên:/);
assert.match(howToAnswer, /matched:/);

const comparisonAnswer = buildExtractiveAnswer("compare login vs register", [authChunk, baseChunk]);
assert.match(comparisonAnswer, /\| Aspect \| Option A \| Option B \| Evidence \|/);

const lowConfidenceAnswer = buildExtractiveAnswer("quantum banana pricing", [baseChunk]);
assert.match(lowConfidenceAnswer, /not enough evidence to answer confidently/i);
assert.match(lowConfidenceAnswer, /cannot infer beyond available text|không thể suy luận vượt quá text/i);