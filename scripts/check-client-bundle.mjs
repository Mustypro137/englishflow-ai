#!/usr/bin/env node
/**
 * Fails if anything secret could reach the browser: scans the client bundles
 * (.next/static) and prerendered pages for the AI key, its variable name and the
 * provider SDK. Run after `npm run build`. CI builds with a canary key to prove it.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const root = ".next";
const clientDir = join(root, "static");
const prerenderedDir = join(root, "server", "app");

function files(dir, filter) {
  let out = [];
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out = out.concat(files(path, filter));
    else if (filter(path)) out.push(path);
  }
  return out;
}

const client = files(clientDir, (p) => /\.(js|css|json)$/.test(p));
if (client.length === 0) {
  console.error("No client bundle found. Run `npm run build` first.");
  process.exit(1);
}
const prerendered = files(prerenderedDir, (p) => /\.(html|rsc|body|meta)$/.test(p));

const key = process.env.ANTHROPIC_API_KEY?.trim();
const checks = [
  { label: "the ANTHROPIC_API_KEY variable name", pattern: "ANTHROPIC_API_KEY", in: client },
  { label: "an Anthropic key prefix", pattern: "sk-ant-", in: [...client, ...prerendered] },
  { label: "the Anthropic SDK", pattern: "@anthropic-ai/sdk", in: client },
  { label: "the Anthropic API address", pattern: "api.anthropic.com", in: client },
  ...(key && key.length >= 8
    ? [{ label: "the configured API key", pattern: key, in: [...client, ...prerendered] }]
    : []),
];

let failed = false;
for (const check of checks) {
  for (const file of check.in) {
    if (readFileSync(file, "utf8").includes(check.pattern)) {
      console.error(`✗ Found ${check.label} in ${file}`);
      failed = true;
    }
  }
}
if (failed) {
  console.error("Secrets or server-only AI code must never be bundled for the browser.");
  process.exit(1);
}
console.log(`✓ No AI secrets in ${client.length} client files and ${prerendered.length} prerendered files.`);
