import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const output = path.join(root, "github-pages-whitelist");
const flatOutput = path.join(root, "github-upload-flat");

await rm(output, { recursive: true, force: true });
await rm(flatOutput, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await mkdir(flatOutput, { recursive: true });

await cp(path.join(dist, "privacy.html"), path.join(output, "privacy.html"));
await cp(path.join(dist, "waitlist-config.js"), path.join(output, "waitlist-config.js"));

const whitelistHtml = await readFile(path.join(dist, "whitelist.html"), "utf8");
const assetPattern = /(?:src|href)=["']\.\/assets\/([^"'?#]+)|(?:from|import\()\s*["']\.\/([^"'?#]+)["']/g;
const requiredAssets = new Set();

function findAssetReferences(content, fromAsset = "") {
  for (const match of content.matchAll(assetPattern)) {
    const referenced = match[1] ?? path.posix.join(path.posix.dirname(fromAsset), match[2]);
    requiredAssets.add(path.posix.normalize(referenced));
  }
}

findAssetReferences(whitelistHtml);
for (const asset of requiredAssets) {
  const content = await readFile(path.join(dist, "assets", asset), "utf8");
  findAssetReferences(content, asset);
}

for (const asset of requiredAssets) {
  const destination = path.join(output, "assets", asset);
  await mkdir(path.dirname(destination), { recursive: true });
  await cp(path.join(dist, "assets", asset), destination);
}

await writeFile(path.join(output, "index.html"), whitelistHtml);
await writeFile(path.join(output, ".nojekyll"), "");

await cp(path.join(output, "privacy.html"), path.join(flatOutput, "privacy.html"));
await cp(path.join(output, "waitlist-config.js"), path.join(flatOutput, "waitlist-config.js"));
await writeFile(path.join(flatOutput, ".nojekyll"), "");

const flatHtml = whitelistHtml.replaceAll("./assets/", "./");
await writeFile(path.join(flatOutput, "index.html"), flatHtml);

for (const asset of requiredAssets) {
  await cp(path.join(dist, "assets", asset), path.join(flatOutput, path.basename(asset)));
}

console.log(`GitHub Pages whitelist generated at ${output}`);
console.log(`Flat GitHub upload generated at ${flatOutput}`);
