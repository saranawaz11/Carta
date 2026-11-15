"use client";

import { Loader2, Trash2, X } from "lucide-react";
import type { ReactNode } from "react";

interface DeleteConfirmModalProps {
  isOpen: boolean;
  noteTitle?: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
  title?: string;
  /* Replaces the default "Are you sure..." sentence */
  body?: ReactNode;
  /* Replaces the default trash footnote */
  footnote?: ReactNode;
  confirmLabel?: string;
}

export function DeleteConfirmModal({
  isOpen,
  noteTitle = "",
  isDeleting,
  onConfirm,
  onDismiss,
  title = "Delete Note",
  body,
  footnote = "This action will move the note to trash. You can restore it later from the Deleted section.",
  confirmLabel = "Delete",
}: DeleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 motion-safe:animate-fade-in">
      <div className="w-full max-w-md rounded-2xl bg-panel shadow-2xl motion-safe:animate-scale-in">
        {/* Header */}
        <div className="border-b border-line px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-8 items-center justify-center rounded-lg bg-red-100 text-red-600">
                <Trash2 size={16} />
              </div>
              <h2 className="text-lg font-semibold text-ink">{title}</h2>
            </div>
            <button
              onClick={onDismiss}
              disabled={isDeleting}
              className="rounded-lg p-1 text-gray-500 hover:bg-white/10 hover:text-ink disabled:opacity-50"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {body ?? (
            <p className="text-sm text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-ink">&ldquo;{noteTitle || "Untitled"}&rdquo;</span>?
            </p>
          )}
          {footnote && <p className="mt-2 text-xs text-gray-500">{footnote}</p>}
        </div>

        {/* Footer */}
        <div className="border-t border-line px-6 py-4">
          <div className="flex gap-2">
            <button
              onClick={onDismiss}
              disabled={isDeleting}
              className="flex-1 rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-white/80 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Deleting...
                </>
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
