import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const buildDir = join(root, ".test-build");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function collectTests(dir, output = []) {
  if (!existsSync(dir)) return output;

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectTests(path, output);
    } else if (entry.isFile() && entry.name.endsWith(".test.js")) {
      output.push(path);
    }
  }

  return output;
}

rmSync(buildDir, { recursive: true, force: true });
const tscBin = join(root, "node_modules", "typescript", "bin", "tsc");
run(process.execPath, [tscBin, "-p", "tsconfig.test.json"]);

const aliasRoot = join(buildDir, "node_modules", "@");
const compiledSrcRoot = join(buildDir, "src");
mkdirSync(aliasRoot, { recursive: true });
for (const entry of readdirSync(compiledSrcRoot, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    cpSync(join(compiledSrcRoot, entry.name), join(aliasRoot, entry.name), { recursive: true });
  }
}

const tests = collectTests(compiledSrcRoot);
if (tests.length === 0) {
  console.error("No compiled test files found.");
  process.exit(1);
}

run(process.execPath, ["--test", ...tests]);
