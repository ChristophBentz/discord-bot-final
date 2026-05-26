"use client";

import { useState } from "react";
import type { ChannelOption } from "@/components/ChannelPicker";
import { PanelCard } from "./PanelCard";
import { CreatePanelForm } from "./CreatePanelForm";

export interface RoleOpt {
  roleId: string;
  name: string;
  color: number;
}

export interface OptionDTO {
  id: number;
  roleId: string;
  label: string;
  description: string | null;
  emoji: string | null;
  buttonStyle: string | null;
}

export interface PanelDTO {
  id: number;
  channelId: string;
  messageId: string | null;
  type: "reaction" | "button" | "dropdown";
  title: string;
  description: string | null;
  color: number | null;
  uniqueChoice: boolean;
  enabled: boolean;
  options: OptionDTO[];
}

interface Props {
  panels: PanelDTO[];
  channels: ChannelOption[];
  roles: RoleOpt[];
}

export function SelfRolesManager({ panels, channels, roles }: Props) {
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-4">
      {panels.length === 0 && !creating && (
        <div className="rounded-2xl border border-dashed border-line bg-bg-elevated/30 px-6 py-10 text-center text-sm text-ink-muted">
          Noch keine Panels angelegt. Klick unten auf „+ Panel anlegen".
        </div>
      )}

      {panels.map((p) => (
        <PanelCard key={p.id} panel={p} channels={channels} roles={roles} />
      ))}

      {creating ? (
        <CreatePanelForm
          channels={channels}
          onDone={() => setCreating(false)}
        />
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="btn-secondary"
        >
          + Panel anlegen
        </button>
      )}
    </div>
  );
}
