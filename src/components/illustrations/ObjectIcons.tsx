// Icon/object illustrations -- lantern, mushaf, compass, mosque, prayer mat,
// crescent, prayer beads. Objects and scenes only, never a human figure --
// see the hard constraint in the Phase 14 illustration system: no depiction
// of Prophets, companions, or any other religious figure, in any style.
type IconProps = { className?: string };

const shared = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function LanternIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...shared}>
      <path d="M12 2v2M9 4h6l1 3H8l1-3Z" />
      <path d="M8 7h8l-1 10H9L8 7Z" />
      <path d="M10 9.5v5M14 9.5v5" />
      <path d="M9 19h6l-1 3h-4l-1-3Z" />
    </svg>
  );
}

export function MushafIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...shared}>
      <path d="M12 5c-1.8-1.2-4-1.6-6-1.2v13.4c2-.4 4.2 0 6 1.2 1.8-1.2 4-1.6 6-1.2V3.8c-2-.4-4.2 0-6 1.2Z" />
      <path d="M12 5v13.4" />
    </svg>
  );
}

export function CompassIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...shared}>
      <circle cx="12" cy="12" r="9" />
      <path d="M14.5 9.5 13 13l-3.5 1.5L11 11l3.5-1.5Z" />
      <circle cx="12" cy="12" r=".6" fill="currentColor" />
    </svg>
  );
}

export function MosqueIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...shared}>
      <path d="M12 2.5a2.5 2.5 0 0 1 2.5 2.5c0 1-.6 1.7-1.2 2.3H10.7c-.6-.6-1.2-1.3-1.2-2.3A2.5 2.5 0 0 1 12 2.5Z" />
      <path d="M12 7.3V10M4 21v-6a3 3 0 0 1 3-3h1a3 3 0 0 1 3 3v6M13 21v-6a3 3 0 0 1 3-3h1a3 3 0 0 1 3 3v6" />
      <path d="M3 21h18M8 21v-4M16 21v-4" />
      <path d="M3 10 6 8M21 10l-3-2" />
    </svg>
  );
}

export function PrayerMatIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...shared}>
      <rect x="3" y="3" width="18" height="18" rx="1.5" />
      <path d="M7 21V9a5 5 0 0 1 10 0v12" />
      <path d="M9 3v3M15 3v3" />
    </svg>
  );
}

export function CrescentIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...shared}>
      <path d="M15.5 3.5A8.5 8.5 0 1 0 20.5 18a9.7 9.7 0 0 1-3-14.5Z" />
    </svg>
  );
}

export function PrayerBeadsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...shared}>
      <circle cx="12" cy="4" r="1.6" />
      <circle cx="18" cy="7" r="1.6" />
      <circle cx="20" cy="13.5" r="1.6" />
      <circle cx="16.5" cy="19" r="1.6" />
      <circle cx="9.5" cy="20" r="1.6" />
      <circle cx="4.5" cy="15.5" r="1.6" />
      <circle cx="5" cy="9" r="1.6" />
      <circle cx="9" cy="4.5" r="1.6" />
      <path d="M12 4v2M9 4.5 12 6" fill="none" />
    </svg>
  );
}
