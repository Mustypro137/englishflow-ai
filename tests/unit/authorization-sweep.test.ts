import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

/*
 * Static sweep: every entry point that can touch learner data checks the session first
 * and uses the id it returns. Server actions and route handlers are reachable by anyone
 * who knows their id or URL, so a single missing check would expose another learner's data.
 */

const APP_DIR = join(process.cwd(), "src", "app");
const GUARDS = /\b(requireUser|requireLearner)\(\)/;

function filesUnder(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && /\.tsx?$/.test(e.name))
    .map((e) => join(e.parentPath, e.name));
}

/** Body of each `export async function name(...) { ... }`, found by matching braces. */
function exportedFunctions(source: string): { name: string; body: string }[] {
  const found: { name: string; body: string }[] = [];
  const re = /export async function (\w+)\s*\(/g;
  for (let m = re.exec(source); m; m = re.exec(source)) {
    // Skip the parameter list (it may contain braces in type annotations) to the body.
    let i = m.index + m[0].length;
    let parens = 1;
    for (; parens > 0; i++) {
      if (source[i] === "(") parens++;
      else if (source[i] === ")") parens--;
    }
    // The body's opening brace ends its line; an inline return type like `{ ok: false }` doesn't.
    const start = source.indexOf("{\n", i) === -1 ? source.indexOf("{\r\n", i) : source.indexOf("{\n", i);
    let depth = 0;
    let end = start;
    do {
      if (source[end] === "{") depth++;
      else if (source[end] === "}") depth--;
      end++;
    } while (depth > 0);
    found.push({ name: m[1], body: source.slice(start, end) });
  }
  return found;
}

const files = filesUnder(APP_DIR);
const rel = (f: string) => relative(process.cwd(), f).replaceAll("\\", "/");

describe("authorization sweep", () => {
  const actionFiles = files.filter((f) => /^\s*["']use server["']/.test(readFileSync(f, "utf8")));

  it("finds the server action files", () => {
    expect(actionFiles.length).toBeGreaterThanOrEqual(15);
  });

  it.each(actionFiles.map((f) => [rel(f), f]))("every action in %s checks the session first", (_name, file) => {
    const fns = exportedFunctions(readFileSync(file, "utf8"));
    expect(fns.length).toBeGreaterThan(0);
    for (const fn of fns) {
      const firstStatement = fn.body.slice(1).trim().split("\n")[0];
      expect(firstStatement, `${fn.name} must start with requireUser()`).toMatch(GUARDS);
    }
  });

  const pages = files.filter((f) => rel(f).startsWith("src/app/app/") && f.endsWith("page.tsx"));

  it.each(pages.map((f) => [rel(f), f]))("%s requires a signed-in learner", (_name, file) => {
    expect(readFileSync(file, "utf8")).toMatch(GUARDS);
  });

  const routes = files.filter((f) => rel(f).startsWith("src/app/api/") && /route\.ts$/.test(f));

  it.each(routes.filter((f) => !rel(f).startsWith("src/app/api/auth/")).map((f) => [rel(f), f]))(
    "%s refuses requests without a session",
    (_name, file) => {
      const source = readFileSync(file, "utf8");
      for (const fn of exportedFunctions(source)) {
        expect(fn.body, fn.name).toMatch(/const user = await getSessionUser\(\);\s*if \(!user\)/);
      }
    },
  );

  it("never trusts a user id sent by the browser", () => {
    for (const file of [...actionFiles, ...routes]) {
      const source = readFileSync(file, "utf8");
      expect(source, rel(file)).not.toMatch(/formData\.get\(["']userId["']\)|\buserId:\s*z\./);
    }
  });
});
