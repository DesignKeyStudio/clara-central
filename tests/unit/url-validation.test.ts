import { describe, expect, it } from "vitest";

import { normalizeUrl, optionalUrlSchema, urlSchema } from "@/lib/validations/url";
import { linkItemSchema } from "@/lib/validations/marketing";

// The fix: website / URL fields accept a bare host (no scheme). `normalizeUrl`
// prepends https:// before Zod's `.url()` check, so "example.com" is valid and
// is persisted as an absolute "https://example.com".

describe("normalizeUrl", () => {
  it("prepends https:// to a bare host", () => {
    expect(normalizeUrl("example.com")).toBe("https://example.com");
    expect(normalizeUrl("www.example.com/path")).toBe("https://www.example.com/path");
    expect(normalizeUrl("sub.example.co.uk")).toBe("https://sub.example.co.uk");
  });

  it("leaves an explicit scheme untouched", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com");
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
    expect(normalizeUrl("mailto:hi@example.com")).toBe("mailto:hi@example.com");
  });

  it("trims surrounding whitespace before normalizing", () => {
    expect(normalizeUrl("  example.com  ")).toBe("https://example.com");
  });

  it("passes an empty string through unchanged", () => {
    expect(normalizeUrl("")).toBe("");
    expect(normalizeUrl("   ")).toBe("");
  });
});

describe("urlSchema (required)", () => {
  it("accepts a bare host and normalizes it", () => {
    expect(urlSchema.parse("example.com")).toBe("https://example.com");
  });

  it("accepts an already-qualified URL unchanged", () => {
    expect(urlSchema.parse("https://example.com/x")).toBe("https://example.com/x");
    expect(urlSchema.parse("http://example.com")).toBe("http://example.com");
  });

  it("rejects an empty string (required)", () => {
    expect(urlSchema.safeParse("").success).toBe(false);
  });

  it("rejects a value that is not a URL even after normalizing", () => {
    expect(urlSchema.safeParse("not a url").success).toBe(false);
  });
});

describe("optionalUrlSchema", () => {
  it("accepts a bare host and normalizes it", () => {
    expect(optionalUrlSchema.parse("example.com")).toBe("https://example.com");
  });

  it("accepts an empty string", () => {
    expect(optionalUrlSchema.parse("")).toBe("");
  });

  it("accepts undefined", () => {
    expect(optionalUrlSchema.parse(undefined)).toBeUndefined();
  });

  it("rejects garbage", () => {
    expect(optionalUrlSchema.safeParse("http://").success).toBe(false);
  });
});

describe("wiring: marketing link item uses the shared url schema", () => {
  it("normalizes a bare-host link url", () => {
    const parsed = linkItemSchema.parse({ name: "Our site", url: "example.com" });
    expect(parsed.url).toBe("https://example.com");
  });
});
