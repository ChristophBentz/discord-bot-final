"use client";

// Visueller Discord-Embed-Klon, der zeigt wie ein RSS-Post aussehen wird.

export interface RssEmbedPreviewData {
  feedName: string;
  feedLink: string | null;
  itemTitle: string;
  itemLink: string | null;
  itemDescription: string | null;
  itemImageUrl: string | null;
  itemAuthor: string | null;
  itemPubDate: string | null;
}

function fav(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

function hostnameOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

export function RssEmbedBody({ data }: { data: RssEmbedPreviewData }) {
  const sourceHost = hostnameOf(data.itemLink) ?? hostnameOf(data.feedLink);
  const iconUrl = sourceHost ? fav(sourceHost) : null;

  return (
    <div
      className="flex max-w-[480px] flex-col gap-2 rounded border-l-[3px] bg-bg-elevated/60 p-3"
      style={{ borderLeftColor: "#f59e0b" }}
    >
      <div className="flex items-center gap-1.5">
        {iconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt="" className="h-4 w-4 rounded" />
        )}
        <span className="text-xs font-medium text-ink-muted">{data.feedName}</span>
      </div>

      <a
        href={data.itemLink ?? "#"}
        target="_blank"
        rel="noopener noreferrer"
        className="text-[15px] font-semibold leading-snug text-brand-light hover:underline"
        onClick={(e) => {
          if (!data.itemLink) e.preventDefault();
        }}
      >
        {truncate(data.itemTitle, 256)}
      </a>

      {data.itemDescription && (
        <div className="whitespace-pre-wrap break-words text-sm text-ink-muted">
          {truncate(data.itemDescription, 500)}
        </div>
      )}

      {data.itemAuthor && (
        <div className="text-xs">
          <span className="font-semibold text-ink">Autor</span>
          <div className="text-ink-muted">{truncate(data.itemAuthor, 100)}</div>
        </div>
      )}

      {data.itemImageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.itemImageUrl}
          alt=""
          className="mt-1 max-h-64 w-full rounded border border-line object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}

      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ink-subtle">
        {iconUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={iconUrl} alt="" className="h-3.5 w-3.5 rounded" />
        )}
        <span>{sourceHost ?? data.feedName}</span>
        {data.itemPubDate && (
          <>
            <span>·</span>
            <span>{new Date(data.itemPubDate).toLocaleString("de-DE")}</span>
          </>
        )}
      </div>
    </div>
  );
}
