import { PLATFORM_LOGOS } from "@/lib/platformLogos";

interface Props {
  /** Plattform-Key: "epic" | "steam" | "gog" (sonst Fallback) */
  platform: string;
  className?: string;
  /** true = Marken-Originalfarbe, sonst currentColor */
  colored?: boolean;
}

/** Marken-Logo einer Spiele-Plattform als SVG. */
export function PlatformLogo({ platform, className = "h-5 w-5", colored = false }: Props) {
  const logo = PLATFORM_LOGOS[platform.toLowerCase()];
  if (!logo) {
    // Fallback für Plattformen ohne Logo (z.B. Konsolen-Sammelkategorie).
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="10" rx="3" />
        <path d="M6 12h4M8 10v4M15 11h.01M18 13h.01" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={colored ? logo.hex : "currentColor"}
      role="img"
      aria-hidden
    >
      <path d={logo.path} />
    </svg>
  );
}
