import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync("index.html", "utf8");
const scripts = globSync("src/**/*.js").map((path) => ({
  path,
  source: readFileSync(path, "utf8"),
}));

describe("segurança estática do cliente", () => {
  it("declara uma política CSP restritiva", () => {
    expect(html).toContain("default-src 'self'");
    expect(html).toContain("script-src 'self'");
    expect(html).toContain("object-src 'none'");
    expect(html).toContain("base-uri 'self'");
    expect(html).toContain("form-action 'none'");
    expect(html).toContain('name="referrer" content="no-referrer"');
  });

  it("não usa execução dinâmica nem APIs de escrita inseguras", () => {
    const forbidden = [
      /\beval\s*\(/,
      /\bnew\s+Function\s*\(/,
      /document\.write\s*\(/,
      /set(?:Timeout|Interval)\s*\(\s*["'`]/,
    ];
    for (const { path, source } of scripts) {
      for (const pattern of forbidden) {
        expect(source, `${path} contém ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("não injeta scripts remotos ou JavaScript inline", () => {
    expect(html).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/i);
    expect(html).not.toMatch(/<script[^>]+src=["']https?:/i);
    expect(html).not.toMatch(/\son\w+\s*=/i);
  });

  it("protege links que abrem nova aba", () => {
    const links = [...html.matchAll(/<a\b[^>]*target=["']_blank["'][^>]*>/gi)];
    expect(links.length).toBeGreaterThan(0);
    for (const [link] of links) {
      expect(link).toMatch(/rel=["'][^"']*noreferrer[^"']*["']/i);
    }
  });
});
