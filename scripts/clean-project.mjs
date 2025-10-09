// scripts/clean-project.mjs
// Safe repo cleaner: finds unused source files, public assets, and old .md docs.
// DRY RUN by default. With "apply", moves candidates into .trash/<timestamp>/.
// No external deps; naive import graph + asset string scan.

import { promises as fs } from "node:fs";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");
const PUBLIC = path.join(ROOT, "public");

function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

const TRASH = path.join(ROOT, ".trash", ts());
const APPLY = process.argv[2] === "apply";

// ---- Configure what to keep regardless ----
const KEEP_ABSOLUTE = new Set(
  [
    "CONTEXT.md",
    "ARCHITECTURE.md",
    "CLAUDE_RULES.md",
    "CHANGELOG-PERF.md",
    "CLEANUP_REPORT.md",
    "DOCS_INDEX.md",
    "scripts/next-port.mjs",
    "scripts/clean-project.mjs",
    "src/perf/PerfFlags.ts",
    "src/scene/Lighting.tsx",
    "src/scene/PostFX.tsx",
    "src/scene/EnvHDRI.tsx",
    "src/scene/applyMaterialGuards.ts",
    "src/scene/OriginRebase.tsx",
  ].map(p => path.join(ROOT, p))
);

// Keep entire folders:
const KEEP_DIRS = [
  path.join(ROOT, "src", "tests", "Playground"),
];

// Root markdown we keep (delete others):
const KEEP_MD = new Set(["CONTEXT.md", "ARCHITECTURE.md", "CLAUDE_RULES.md", "CHANGELOG-PERF.md", "DOCS_INDEX.md"]);

// Entry candidates for the import graph:
const ENTRY_CANDIDATES = [
  "src/main.tsx",
  "src/main.ts",
  "src/index.tsx",
  "src/index.ts",
  "src/App.tsx",
].map(p => path.join(ROOT, p));

// Extensions we consider "source":
const SRC_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".css", ".scss", ".json", ".glsl", ".vert", ".frag"]);

// Asset extensions to track:
const ASSET_EXT = new Set([".hdr", ".ktx2", ".ktx", ".png", ".jpg", ".jpeg", ".webp", ".avif", ".glb", ".gltf", ".bin", ".mp4", ".mp3", ".ogg", ".wav"]);

// Ignore dirs:
const IGNORE_DIRS = new Set(["node_modules", "dist", ".trash", ".git", ".vscode", ".idea", "coverage"]);

async function walk(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (IGNORE_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...await walk(p));
    } else {
      out.push(p);
    }
  }
  return out;
}

function isSrcFile(f) {
  return SRC_EXT.has(path.extname(f));
}

function parseImports(code) {
  const out = new Set();
  const patterns = [
    /import\s+[^'"]*?from\s+['"]([^'"]+)['"]/g,
    /export\s+[^'"]*?from\s+['"]([^'"]+)['"]/g,
    /require\(\s*['"]([^'"]+)['"]\s*\)/g,
    /import\(\s*['"]([^'"]+)['"]\s*\)/g,
    /new\s+URL\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url\s*\)/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(code))) out.add(m[1]);
  }
  return [...out];
}

function resolveImport(fromFile, spec) {
  // Support "@/..." alias => src/
  if (spec.startsWith("@/")) {
    spec = "./" + path.relative(path.dirname(fromFile), path.join(ROOT, "src", spec.slice(2))).replace(/\\/g, "/");
  }
  if (/^(https?:)?\/\//.test(spec)) return null; // external URL
  if (spec.startsWith("data:")) return null;    // data URI
  if (!spec.startsWith(".") && !spec.startsWith("/")) return null; // npm dep

  let target = spec.startsWith("/")
    ? path.join(ROOT, spec)
    : path.join(path.dirname(fromFile), spec);

  const tryExts = ["", ".ts", ".tsx", ".js", ".jsx", ".json", ".css", ".glsl", ".vert", ".frag"];
  for (const ext of tryExts) {
    const f = target + ext;
    if (existsSync(f)) return f;
  }
  // index resolution
  for (const ext of tryExts) {
    const f = path.join(target, "index" + ext);
    if (existsSync(f)) return f;
  }
  return null;
}

async function main() {
  if (!existsSync(SRC)) {
    console.error("No src/ folder found.");
    process.exit(1);
  }

  // Build import graph from entry
  const entries = ENTRY_CANDIDATES.filter(existsSync);
  if (entries.length === 0) {
    console.warn("No standard entry found. Using src/App.tsx if exists.");
    const fallback = path.join(ROOT, "src", "App.tsx");
    if (existsSync(fallback)) entries.push(fallback);
  }
  if (entries.length === 0) {
    console.error("Cannot find a project entry (src/main.tsx, src/index.tsx, src/App.tsx). Aborting.");
    process.exit(1);
  }

  const allSrcFiles = (await walk(SRC)).filter(isSrcFile);
  const used = new Set(entries);
  const queue = [...entries];

  const assetRefs = new Set();

  while (queue.length) {
    const cur = queue.pop();
    if (!existsSync(cur)) continue;
    let code = "";
    try {
      code = await fs.readFile(cur, "utf8");
    } catch { continue; }

    const imports = parseImports(code);
    for (const spec of imports) {
      const ext = path.extname(spec).toLowerCase();
      if (ASSET_EXT.has(ext)) {
        let abs = spec;
        if (spec.startsWith(".")) abs = path.join(path.dirname(cur), spec);
        assetRefs.add(path.normalize(abs));
      }
      const res = resolveImport(cur, spec);
      if (!res) continue;
      if (!used.has(res)) {
        used.add(res);
        queue.push(res);
      }
    }
  }

  // Unused source files = all src minus used, minus KEEP_DIRS contents
  const keepDirSet = new Set(KEEP_DIRS.map(d => d.toLowerCase()));
  const isInKeptDir = (f) => [...keepDirSet].some(dir => f.toLowerCase().startsWith(dir + path.sep));
  const unusedSrc = allSrcFiles
    .filter(f => !used.has(f))
    .filter(f => !isInKeptDir(f))
    .filter(f => !KEEP_ABSOLUTE.has(f));

  // PUBLIC assets: mark used if any code mentions filename or path
  let publicFiles = [];
  if (existsSync(PUBLIC)) publicFiles = await walk(PUBLIC);

  // Build a big string of all code to check for literal references (cheap but works)
  const codeText = (await Promise.all(allSrcFiles.map(p => fs.readFile(p, "utf8").catch(() => "")))).join("\n");

  const usedPublic = new Set();
  const unusedPublic = [];
  for (const f of publicFiles) {
    const rel = "/" + path.relative(PUBLIC, f).replace(/\\/g, "/"); // e.g., /env/hdr.hdr
    const base = path.basename(f);
    const probable = codeText.includes(rel) || codeText.includes(base);
    if (probable) usedPublic.add(f);
    else unusedPublic.push(f);
  }

  // Markdown cleanup
  const allFiles = await walk(ROOT);
  const mdFiles = allFiles.filter(f => path.extname(f).toLowerCase() === ".md");
  const mdCandidates = mdFiles
    .filter(f => !KEEP_ABSOLUTE.has(f))
    .filter(f => KEEP_MD.has(path.basename(f)) ? false : true);

  // Never move kept absolute or inside kept dirs
  const candidates = [
    ...unusedSrc,
    ...unusedPublic,
    ...mdCandidates,
  ].filter(f => !KEEP_ABSOLUTE.has(f) && !isInKeptDir(f));

  // Write report
  const reportPath = path.join(ROOT, "CLEANUP_REPORT.md");
  const docsIndexPath = path.join(ROOT, "DOCS_INDEX.md");
  const keptDocs = mdFiles.filter(f => KEEP_MD.has(path.basename(f)) || KEEP_ABSOLUTE.has(f));

  const rel = (p) => path.relative(ROOT, p).replace(/\\/g, "/");

  const report = [
    "# Cleanup Report",
    "",
    `Date: ${new Date().toISOString()}`,
    "",
    "## Summary",
    `- Unused source files (candidates): **${unusedSrc.length}**`,
    `- Unused public assets (candidates): **${unusedPublic.length}**`,
    `- Markdown to delete (candidates): **${mdCandidates.length}**`,
    "",
    "## Unused source (top 200 shown)",
    ...unusedSrc.slice(0,200).map(f => "- " + rel(f)),
    unusedSrc.length > 200 ? `...and ${unusedSrc.length-200} more` : "",
    "",
    "## Unused public assets (top 200 shown)",
    ...unusedPublic.slice(0,200).map(f => "- " + rel(f)),
    unusedPublic.length > 200 ? `...and ${unusedPublic.length-200} more` : "",
    "",
    "## Markdown candidates",
    ...mdCandidates.map(f => "- " + rel(f)),
    "",
    "## Notes",
    "- This is a DRY RUN unless you run `node scripts/clean-project.mjs apply`.",
    "- Files will be MOVED to `.trash/<timestamp>/`, not deleted.",
    "- Review before commit. Restore by moving back from `.trash/`.",
  ].join("\n");

  const docsIndex = [
    "# Docs Index (Kept)",
    "",
    ...keptDocs.map(f => "- " + rel(f)),
    "",
    "Non-kept docs have been listed in CLEANUP_REPORT.md under Markdown candidates.",
  ].join("\n");

  await fs.writeFile(reportPath, report, "utf8");
  await fs.writeFile(docsIndexPath, docsIndex, "utf8");

  if (!APPLY) {
    console.log("🧪 DRY RUN complete. See CLEANUP_REPORT.md and DOCS_INDEX.md");
    return;
  }

  // APPLY = move candidates to .trash/<ts>/
  await fs.mkdir(TRASH, { recursive: true });

  for (const f of candidates) {
    const target = path.join(TRASH, path.relative(ROOT, f));
    await fs.mkdir(path.dirname(target), { recursive: true });
    try {
      await fs.rename(f, target);
      console.log("🗑️  Moved:", rel(f));
    } catch (e) {
      console.warn("⚠️  Failed to move:", rel(f), e?.message);
    }
  }

  console.log("");
  console.log("✅ Applied. Moved", candidates.length, "items into", path.relative(ROOT, TRASH));
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
