import type { ReactNode } from "react";

export function ProtectedStub({ label, icon }: { label: string; icon: ReactNode }) {
  return (
    <button
      type="button"
      disabled
      title="Admin/Mod — vor Bot-Aktionen geschützt"
      className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl border border-line bg-bg-elevated/30 px-3.5 py-2 text-sm font-medium text-ink-subtle opacity-50"
    >
      {icon}
      {label}
    </button>
  );
}
