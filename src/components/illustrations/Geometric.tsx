// Restrained geometric/arabesque motifs -- thin linework, low-opacity fills,
// no figurative content. For section headers, card backgrounds, and
// milestone moments across Learn/Family (and anywhere else that wants
// texture without a literal scene).
type MotifProps = { className?: string; variant?: "star8" | "weave" | "corner"; opacity?: number };

// An 8-point star polygon, the most common Islamic geometric motif -- drawn
// as two overlaid squares (a common construction method), stroke-only.
function Star8({ opacity = 0.35 }: { opacity?: number }) {
  return (
    <g opacity={opacity} fill="none" stroke="currentColor" strokeWidth={1}>
      <rect x="20" y="20" width="60" height="60" transform="rotate(0 50 50)" />
      <rect x="20" y="20" width="60" height="60" transform="rotate(45 50 50)" />
    </g>
  );
}

// A repeating interlace/weave band -- suggests arabesque tessellation
// without rendering a full complex pattern.
function Weave({ opacity = 0.3 }: { opacity?: number }) {
  return (
    <g opacity={opacity} fill="none" stroke="currentColor" strokeWidth={1}>
      {[0, 25, 50, 75].map((x) => (
        <path key={x} d={`M ${x} 100 Q ${x + 12.5} 50 ${x} 0 Q ${x - 12.5} 50 ${x} 100`} />
      ))}
    </g>
  );
}

// A single arabesque corner flourish, meant to sit in a card corner.
function Corner({ opacity = 0.4 }: { opacity?: number }) {
  return (
    <g opacity={opacity} fill="none" stroke="currentColor" strokeWidth={1.2}>
      <path d="M0 40 Q0 0 40 0" />
      <path d="M0 60 Q0 100 40 100 M60 0 Q100 0 100 40" />
      <circle cx="40" cy="0" r="3" />
      <circle cx="0" cy="40" r="3" />
    </g>
  );
}

export function GeometricMotif({ className, variant = "star8", opacity }: MotifProps) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {variant === "star8" && <Star8 opacity={opacity} />}
      {variant === "weave" && <Weave opacity={opacity} />}
      {variant === "corner" && <Corner opacity={opacity} />}
    </svg>
  );
}
