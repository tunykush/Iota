import assert from "node:assert/strict";
import test from "node:test";
import { createLocalEmbeddingProvider } from "./local";

test("local embedding provider returns deterministic normalized vectors", async () => {
  const provider = createLocalEmbeddingProvider(16);
  const first = await provider.embed({ input: ["hello world", "hello world"] });
  const second = await provider.embed({ input: ["hello world"] });

  assert.equal(first.provider, "local");
  assert.equal(first.dimensions, 16);
  assert.deepEqual(first.embeddings[0], first.embeddings[1]);
  assert.deepEqual(first.embeddings[0], second.embeddings[0]);
  assert.equal(first.embeddings[0].length, 16);
});