// scripts/next-port.mjs
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const stateDir = join(__dirname, ".state");
const stateFile = join(stateDir, "last-port.txt");
if (!existsSync(stateDir)) mkdirSync(stateDir, { recursive: true });

const BASE = 2200;
let last = BASE - 1;
if (existsSync(stateFile)) {
  const txt = readFileSync(stateFile, "utf8").trim();
  const n = parseInt(txt, 10);
  if (!Number.isNaN(n)) last = n;
}
const next = last + 1;
writeFileSync(stateFile, String(next), "utf8");

// Strict port so it DOESN'T reuse; it forces the increment behavior we want.
const args = ["vite", "--port", String(next), "--strictPort"];
console.log(`▶ Starting Vite on http://localhost:${next}`);
const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", args, {
  stdio: "inherit",
  env: process.env,
});
child.on("exit", (code) => process.exit(code ?? 0));