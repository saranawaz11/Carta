"use client";

import { Button } from "@/components/ui/button";

export type PendingAction = {
  action: "update" | "archive" | "delete";
  note_id: string;
  note_title: string;
  expected_updated_at: string;
  changes: Record<string, string>;
};

function actionDescription(action: PendingAction): string {
  if (action.action === "archive") return "Archive this note?";
  if (action.action === "delete") return "Move this note to Deleted?";
  return "Apply these changes?";
}

export function ActionCard({
  action,
  disabled,
  onConfirm,
  onCancel,
}: {
  action: PendingAction;
  disabled: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div role="group" aria-label="Confirm note action">
      <p>
        {actionDescription(action)} <strong>{action.note_title}</strong>
      </p>
      {Object.entries(action.changes).map(([field, value]) => (
        <p key={field}>
          {field === "title" ? "Title" : "Content"}: {value}
        </p>
      ))}
      <div className="flex gap-2">
        <Button type="button" disabled={disabled} onClick={onConfirm}>
          Confirm
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
