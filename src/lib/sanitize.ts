import sanitizeHtml from "sanitize-html";

/**
 * Server-side HTML sanitizer for admin-authored marketing descriptions.
 *
 * The Tiptap editor's schema is the first line of defense (only registered
 * nodes/marks can exist), but the server action receives raw `unknown` input, so
 * this is the AUTHORITATIVE pass — run on write, before persisting. The allowlist
 * mirrors the editor toolbar (bold / italic / lists / links). Keep the two in
 * sync: adding a toolbar button (e.g. headings) means adding the tag here too, or
 * the formatting is silently stripped on save.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "a"],
  allowedAttributes: { a: ["href", "target", "rel"] },
  allowedSchemes: ["http", "https", "mailto"],
  // Force safe link attributes so an admin-entered link can't tab-nab.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer", target: "_blank" }),
  },
};

/**
 * Sanitize a rich-text description. Returns null for empty/whitespace-only input
 * (so the column stays null rather than holding `<p></p>`).
 */
export function sanitizeDescription(html: string | null | undefined): string | null {
  if (!html) return null;
  const clean = sanitizeHtml(html, OPTIONS).trim();
  // Treat an editor's "empty" output (e.g. "<p></p>") as no description.
  const stripped = clean.replace(/<p>\s*<\/p>/g, "").replace(/<br\s*\/?>/g, "").trim();
  return stripped.length > 0 ? clean : null;
}
