"use client";

import { Archive, Loader2, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export type PendingAction = {
  action: "update" | "archive" | "delete";
  note_id: string;
  note_title: string;
  expected_updated_at: string;
  changes: Record<string, string>;
};

const COPY = {
  update: { icon: Pencil, question: "Apply these changes?", confirm: "Apply changes" },
  archive: { icon: Archive, question: "Archive this note?", confirm: "Archive" },
  delete: { icon: Trash2, question: "Move this note to Trash?", confirm: "Move to Trash" },
} as const;

export function ActionCard({
  action,
  disabled,
  confirming = false,
  onConfirm,
  onCancel,
}: {
  action: PendingAction;
  disabled: boolean;
  confirming?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { icon: Icon, question, confirm } = COPY[action.action];
  const changes = Object.entries(action.changes);

  return (
    <div
      role="group"
      aria-label="Confirm note action"
      className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50/70 p-4 motion-safe:animate-fade-up sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700">
          <Icon size={18} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{question}</p>
          <p className="truncate text-sm text-gray-600">
            {action.note_title || "Untitled"}
          </p>
        </div>
      </div>

      {changes.length > 0 && (
        <dl className="flex flex-col gap-2">
          {changes.map(([field, value]) => (
            <div
              key={field}
              className="rounded-xl border border-red-100 bg-panel px-3.5 py-2.5"
            >
              <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                {field === "title" ? "Title" : "Content"}
              </dt>
              <dd className="mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words text-sm text-gray-800">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          disabled={disabled}
          onClick={onCancel}
          className="rounded-full text-gray-600 transition-colors duration-200 hover:bg-red-100 hover:text-red-700"
        >
          Dismiss
        </Button>
        <Button
          type="button"
          disabled={disabled}
          onClick={onConfirm}
          className="gap-2 rounded-full bg-red-700 px-5 text-white transition-[transform,background-color] duration-200 hover:bg-red-800 active:scale-[0.98]"
        >
          {confirming && <Loader2 size={16} className="animate-spin" />}
          {confirm}
        </Button>
      </div>
    </div>
  );
}