"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface PromptOptions {
  title?: string;
  message?: ReactNode;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  maxLength?: number;
}

interface AlertOptions {
  title?: string;
  message: ReactNode;
  danger?: boolean;
}

interface DialogApi {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
  alert: (opts: AlertOptions) => Promise<void>;
}

const DialogContext = createContext<DialogApi | null>(null);

/** Ersatz für window.confirm/prompt/alert — als interne, gestylte Modals. */
export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog muss innerhalb von <DialogProvider> verwendet werden.");
  return ctx;
}

type Kind = "confirm" | "prompt" | "alert";

interface ActiveDialog {
  kind: Kind;
  title?: string;
  message?: ReactNode;
  label?: string;
  placeholder?: string;
  maxLength?: number;
  confirmLabel: string;
  cancelLabel: string;
  danger: boolean;
  resolve: (value: boolean | string | null) => void;
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<ActiveDialog | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(
    (value: boolean | string | null) => {
      setDialog((d) => {
        d?.resolve(value);
        return null;
      });
    },
    [],
  );

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setDialog({
          kind: "confirm",
          title: opts.title ?? "Bestätigen",
          message: opts.message,
          confirmLabel: opts.confirmLabel ?? "Bestätigen",
          cancelLabel: opts.cancelLabel ?? "Abbrechen",
          danger: opts.danger ?? false,
          resolve: (v) => resolve(Boolean(v)),
        });
      }),
    [],
  );

  const prompt = useCallback(
    (opts: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setInputValue(opts.defaultValue ?? "");
        setDialog({
          kind: "prompt",
          title: opts.title ?? "Eingabe",
          message: opts.message,
          label: opts.label,
          placeholder: opts.placeholder,
          maxLength: opts.maxLength,
          confirmLabel: opts.confirmLabel ?? "Speichern",
          cancelLabel: "Abbrechen",
          danger: false,
          resolve: (v) => resolve(typeof v === "string" ? v : null),
        });
      }),
    [],
  );

  const alert = useCallback(
    (opts: AlertOptions) =>
      new Promise<void>((resolve) => {
        setDialog({
          kind: "alert",
          title: opts.title ?? "Hinweis",
          message: opts.message,
          confirmLabel: "OK",
          cancelLabel: "OK",
          danger: opts.danger ?? false,
          resolve: () => resolve(),
        });
      }),
    [],
  );

  // Fokus setzen, sobald ein Dialog erscheint
  useEffect(() => {
    if (dialog?.kind === "prompt") {
      const t = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 30);
      return () => clearTimeout(t);
    }
  }, [dialog]);

  // Tastatur + Body-Scroll-Sperre
  useEffect(() => {
    if (!dialog) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(dialog.kind === "confirm" ? false : null);
      if (e.key === "Enter" && dialog.kind !== "prompt") {
        e.preventDefault();
        accept();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dialog, inputValue]);

  const accept = () => {
    if (!dialog) return;
    if (dialog.kind === "prompt") close(inputValue);
    else if (dialog.kind === "alert") close(true);
    else close(true);
  };

  const cancel = () => {
    if (!dialog) return;
    close(dialog.kind === "confirm" ? false : null);
  };

  const api: DialogApi = { confirm, prompt, alert };

  return (
    <DialogContext.Provider value={api}>
      {children}
      {dialog &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) cancel();
            }}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" aria-hidden />
            <div className="relative w-full max-w-md card p-6">
              <div className="flex items-start gap-3">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    dialog.danger
                      ? "bg-rose-500/15 text-rose-400"
                      : "bg-brand/15 text-brand"
                  }`}
                >
                  {dialog.danger ? (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                      <path d="M12 9v4M12 17h.01" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 16v-4M12 8h.01" />
                    </svg>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-ink">{dialog.title}</h2>
                  {dialog.message != null && (
                    <div className="mt-1 text-sm text-ink-muted">{dialog.message}</div>
                  )}

                  {dialog.kind === "prompt" && (
                    <div className="mt-4">
                      {dialog.label && (
                        <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">
                          {dialog.label}
                        </label>
                      )}
                      <input
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder={dialog.placeholder}
                        maxLength={dialog.maxLength}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            close(inputValue);
                          }
                        }}
                        className="input w-full"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                {dialog.kind !== "alert" && (
                  <button
                    type="button"
                    onClick={cancel}
                    className="rounded-lg border border-line bg-bg-elevated/60 px-4 py-2 text-sm font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
                  >
                    {dialog.cancelLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={accept}
                  className={
                    dialog.danger
                      ? "rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-500"
                      : "btn-primary"
                  }
                >
                  {dialog.confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </DialogContext.Provider>
  );
}
