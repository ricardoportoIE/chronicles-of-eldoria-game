import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync("index.html", "utf8");
const workflow = readFileSync(".github/workflows/quality.yml", "utf8");
const scripts = globSync("src/**/*.js").map((path) => ({
  path,
  source: readFileSync(path, "utf8"),
}));

describe("static client security", () => {
  it("declares a restrictive CSP", () => {
    expect(html).toContain("default-src 'self'");
    expect(html).toContain("script-src 'self'");
    expect(html).toContain("object-src 'none'");
    expect(html).toContain("base-uri 'self'");
    expect(html).toContain("form-action 'none'");
    expect(html).toContain('name="referrer" content="no-referrer"');
  });

  it("does not use dynamic execution or unsafe write APIs", () => {
    const forbidden = [
      /\beval\s*\(/,
      /\bnew\s+Function\s*\(/,
      /document\.write\s*\(/,
      /set(?:Timeout|Interval)\s*\(\s*["'`]/,
    ];
    for (const { path, source } of scripts) {
      for (const pattern of forbidden) {
        expect(source, `${path} contains ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("does not inject remote scripts or inline JavaScript", () => {
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
    expect(html).not.toMatch(/<script[^>]+src=["']https?:/i);
    expect(html).not.toMatch(/\son\w+\s*=/i);
  });

  it("protects links that open a new tab", () => {
    const links = [...html.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)];
    expect(links.length).toBeGreaterThan(0);
    for (const [link] of links) {
      expect(link).toMatch(/rel=["'][^"']*noreferrer[^"']*["']/i);
    }
  });

  it("keeps continuous integration read-only and avoids privileged pull-request triggers", () => {
    expect(workflow).toContain("contents: read");
    expect(workflow).not.toContain("pull_request_target");
    expect(workflow).toContain("actions/checkout@v7");
    expect(workflow).toContain("actions/setup-node@v7");
    expect(workflow).toContain("npm ci");
    expect(workflow).toContain("npm run test:quality");
  });
});
