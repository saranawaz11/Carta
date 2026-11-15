"use client";

import { Loader2, Pencil, RefreshCw, X } from "lucide-react";

interface TitleConfirmModalProps {
  isOpen: boolean;
  currentTitle: string;
  suggestedTitle: string;
  content: string;
  isRegenerating: boolean;
  isConfirming: boolean;
  onConfirm: () => void;
  onRegenerate: () => void;
  onDismiss: () => void;
}

export function TitleConfirmModal({
  isOpen,
  currentTitle,
  suggestedTitle,
  content,
  isRegenerating,
  isConfirming,
  onConfirm,
  onRegenerate,
  onDismiss,
}: TitleConfirmModalProps) {
  if (!isOpen) return null;

  const busy = isRegenerating || isConfirming;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 motion-safe:animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="title-confirm-heading"
        className="w-full max-w-md rounded-2xl bg-panel shadow-2xl motion-safe:animate-scale-in"
      >
        <div className="border-b border-line px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-tint text-brand">
                <Pencil size={16} />
              </div>
              <h2 id="title-confirm-heading" className="text-lg font-semibold text-ink">
                Apply suggested title?
              </h2>
            </div>
            <button
              onClick={onDismiss}
              disabled={busy}
              className="rounded-lg p-1 text-gray-500 hover:bg-white/10 hover:text-ink disabled:opacity-50"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
              Current title
            </p>
            <p className="mt-1 truncate text-sm text-gray-600">{currentTitle || "Untitled"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
              Suggested title
            </p>
            <p className="mt-1 break-words text-sm font-semibold text-ink">
              {suggestedTitle || "Untitled note"}
            </p>
          </div>
          {content && (
            <div className="rounded-xl border border-line bg-tint px-3.5 py-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                Content changes will also be applied
              </p>
              <p className="mt-1 max-h-32 overflow-y-auto whitespace-pre-wrap break-words text-sm text-ink">
                {content}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">
          <button
            type="button"
            onClick={onDismiss}
            disabled={busy}
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-white/80 disabled:opacity-50"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={onRegenerate}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-white/80 disabled:opacity-50"
          >
            {isRegenerating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            Regenerate
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-button px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-button-hover disabled:opacity-50"
          >
            {isConfirming && <Loader2 size={16} className="animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
