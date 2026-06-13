import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const docs = path.join(root, "docs");

await rm(docs, { recursive: true, force: true });
await mkdir(docs, { recursive: true });
await cp(dist, docs, { recursive: true });
await writeFile(path.join(docs, ".nojekyll"), "");

const manifestPath = path.join(docs, "manifest.webmanifest");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.id = "./index.html";
manifest.start_url = "./index.html";
manifest.scope = "./";
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

const swPath = path.join(docs, "sw.js");
const sw = await readFile(swPath, "utf8");
const normalizedSw = sw
  .replace('const SHELL_CACHE = "falles360-shell-v32";', 'const SHELL_CACHE = "falles360-shell-v33";')
  .replace('const RUNTIME_CACHE = "falles360-runtime-v32";', 'const RUNTIME_CACHE = "falles360-runtime-v33";')
  .replace('  "./guest.php",\n', "")
  .replace('  "./login.php",\n', "");
await writeFile(swPath, normalizedSw);

console.log(`GitHub Pages docs generated at ${docs}`);
