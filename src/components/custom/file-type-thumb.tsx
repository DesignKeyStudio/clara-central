import { cn } from "@/lib/utils";

/**
 * Cover thumbnail for non-image marketing files (and the image fallback),
 * shared by the partner library cards and the admin authoring rows. Renders a
 * light document glyph on a soft neutral background, with a colored type band
 * (PDF red, DOC blue, …) — mirroring a familiar file-icon look. The label is
 * the item's badge `type`. Size scales to the container via `className`
 * (partner cards fill `h-full`; admin rows pass a compact `size-12`).
 */
const TYPE_COLOR: Record<string, string> = {
  PDF: "#D6573F",
  DOC: "#5B8DEF",
  DOCX: "#5B8DEF",
  PPT: "#E0833C",
  PPTX: "#E0833C",
  XLSX: "#1F9D6B",
  ZIP: "#6B7787",
  IMAGE: "#3F9D82",
  LINK: "#00897A",
};

const DEFAULT_COLOR = "#7B8794";

/** Types rendered from an uploaded PNG glyph in /public instead of the SVG. */
const IMAGE_GLYPH: Record<string, string> = {
  PDF: "/PDF.png",
  DOC: "/DOC.png",
  DOCX: "/DOC.png",
  PPT: "/PPTX.png",
  PPTX: "/PPTX.png",
  XLSX: "/XLSX.png",
  ZIP: "/ZIP.png",
  IMAGE: "/IMAGE.png",
  LINK: "/LINK.png",
};

export function FileTypeThumb({ type, className }: { type: string; className?: string }) {
  const color = TYPE_COLOR[type] ?? DEFAULT_COLOR;
  // Shrink the label font for longer labels so it fits the band.
  const fontSize = type.length >= 5 ? 9 : type.length === 4 ? 10.5 : 12;
  const glyphSrc = IMAGE_GLYPH[type];

  if (glyphSrc) {
    return (
      <div
        className={cn("flex h-24 items-center justify-center rounded-md bg-[#F4F4F2]", className)}
        role="img"
        aria-label={`${type} file`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={glyphSrc} alt="" className="h-[58%] w-auto object-contain" loading="lazy" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-24 items-center justify-center rounded-md bg-[#F4F4F2]",
        className,
      )}
      role="img"
      aria-label={`${type} file`}
    >
      <svg
        viewBox="0 0 72 90"
        className="h-[58%] w-auto"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Page body */}
        <path
          d="M16 4h26l16 16v62a4 4 0 0 1-4 4H16a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z"
          fill="#DCE1E8"
        />
        {/* Folded corner */}
        <path d="M42 4l16 16H46a4 4 0 0 1-4-4V4z" fill="#C3CAD3" />
        {/* Text lines */}
        <rect x="24" y="34" width="24" height="3.4" rx="1.7" fill="#C3CAD3" />
        <rect x="24" y="42" width="16" height="3.4" rx="1.7" fill="#C3CAD3" />
        {/* Colored type band */}
        <rect x="8" y="52" width="44" height="18" rx="3" fill={color} />
        <text
          x="30"
          y="61.5"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#FFFFFF"
          fontSize={fontSize}
          fontWeight="800"
          fontFamily="inherit"
          letterSpacing="0.5"
        >
          {type}
        </text>
      </svg>
    </div>
  );
}
