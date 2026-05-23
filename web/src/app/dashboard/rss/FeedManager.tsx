"use client";

import { useState } from "react";
import type { ChannelOption } from "@/components/ChannelPicker";
import { FeedRow } from "./FeedRow";
import { FeedForm } from "./FeedForm";

export interface FeedDTO {
  id: number;
  name: string;
  url: string;
  channelId: string;
  pingRoleId: string | null;
  intervalMin: number;
  maxPostsPerRun: number;
  enabled: boolean;
  lastCheck: string | null;
  lastError: string | null;
}

export interface RoleOpt {
  roleId: string;
  name: string;
  color: number;
}

interface Props {
  feeds: FeedDTO[];
  channels: ChannelOption[];
  roles: RoleOpt[];
  bot: { name: string; avatarUrl: string | null };
}

export function FeedManager({ feeds, channels, roles, bot }: Props) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Deine Feeds</h2>
            <p className="mt-0.5 text-xs text-ink-subtle">
              {feeds.length === 0
                ? "Noch keine Feeds — leg unten den ersten an."
                : `${feeds.length} Feed${feeds.length === 1 ? "" : "s"} konfiguriert`}
            </p>
          </div>
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="btn-primary"
            >
              + Neuen Feed anlegen
            </button>
          )}
        </div>

        {adding && (
          <div className="mb-5 rounded-2xl border border-brand/40 bg-brand/5 p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink">Neuen Feed anlegen</h3>
              <button
                type="button"
                onClick={() => setAdding(false)}
                className="text-xs text-ink-muted hover:text-ink"
              >
                Abbrechen
              </button>
            </div>
            <FeedForm
              channels={channels}
              roles={roles}
              bot={bot}
              onDone={() => setAdding(false)}
            />
          </div>
        )}

        {feeds.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-bg-elevated/30 px-6 py-10 text-center text-sm text-ink-muted">
            Keine Feeds vorhanden. Beispiele für RSS-URLs:{" "}
            <span className="font-mono text-xs">https://www.heise.de/rss/heise.rdf</span>,{" "}
            <span className="font-mono text-xs">https://feeds.bbci.co.uk/news/rss.xml</span>.
          </div>
        ) : (
          <div className="space-y-3">
            {feeds.map((f) => (
              <FeedRow key={f.id} feed={f} channels={channels} roles={roles} bot={bot} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
