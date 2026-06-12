// Footer für die öffentlichen Seiten (/u/[id], /leaderboard).
// Branding via NEXT_PUBLIC_BRAND_NAME + NEXT_PUBLIC_BRAND_URL — wenn
// keine Env gesetzt ist, fällt's auf moser-dev.com zurück.

const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? "";
const BRAND_URL = process.env.NEXT_PUBLIC_BRAND_URL ?? "";

export function PublicFooter({ className = "" }: { className?: string }) {
  if (BRAND_NAME && BRAND_URL) {
    return (
      <span className={className}>
        Powered by{" "}
        <a
          href={BRAND_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand hover:underline"
        >
          {BRAND_NAME}
        </a>
      </span>
    );
  }
  if (BRAND_NAME) {
    return <span className={className}>Powered by {BRAND_NAME}</span>;
  }
  return (
    <span className={className}>
      Powered by{" "}
      <a
        href="https://moser-dev.com"
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand hover:underline"
      >
        moser-dev.com
      </a>
    </span>
  );
}
