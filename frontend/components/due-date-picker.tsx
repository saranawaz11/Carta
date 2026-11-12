"use client";

import { Popover } from "@base-ui/react/popover";
import { useState, type ReactNode } from "react";
import { DayPicker, type DateRange } from "react-day-picker";

import { selectionFromTask, type DueSelection } from "@/lib/tasks";

type Props = {
  value: DueSelection;
  onChange: (value: DueSelection) => void | Promise<void>;
  children: ReactNode;
  ariaLabel: string;
  className?: string;
};

export function DueDatePicker({ value, onChange, children, ariaLabel, className }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DueSelection>(value);

  const isRange = Boolean(
    draft.from && draft.to && draft.from.toDateString() !== draft.to.toDateString(),
  );

  function handleOpenChange(next: boolean) {
    if (next) setDraft(value);
    setOpen(next);
  }

  function selectRange(range: DateRange | undefined) {
    const from = range?.from;
    const to = range?.to && from && range.to.getTime() !== from.getTime() ? range.to : undefined;
    setDraft((current) => ({ from, to, time: to ? "" : current.time }));
  }

  async function apply(next: DueSelection) {
    setOpen(false);
    await onChange(next);
  }

  return (
    <Popover.Root open={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger aria-label={ariaLabel} className={className}>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end" className="z-50">
          <Popover.Popup className="rounded-2xl border border-red-100 bg-panel p-3 text-gray-900 shadow-xl outline-none">
            <DayPicker
              mode="range"
              selected={draft.from ? { from: draft.from, to: draft.to } : undefined}
              onSelect={selectRange}
              defaultMonth={draft.from ?? new Date()}
              weekStartsOn={1}
              style={{ "--rdp-accent-color": "#b91c1c", margin: 0 } as React.CSSProperties}
            />
            <p className="px-2 pb-2 text-[11px] text-gray-500">
              Pick one day, or click a second day for a range.
            </p>
            <label className="flex items-center justify-between gap-3 px-2 pb-3 text-sm">
              <span className={isRange ? "text-gray-400" : "text-gray-700"}>Time (optional)</span>
              <input
                type="time"
                value={draft.time}
                disabled={isRange || !draft.from}
                onChange={(event) => setDraft({ ...draft, time: event.target.value })}
                className="rounded-lg border border-red-100 bg-page px-2 py-1 text-sm outline-none focus:border-red-300 disabled:opacity-50"
              />
            </label>
            <div className="flex items-center justify-between gap-2 border-t border-red-100 px-1 pt-3">
              <button
                type="button"
                onClick={() => void apply({ from: undefined, to: undefined, time: "" })}
                className="rounded-full px-3 py-1.5 text-sm text-gray-600 hover:bg-red-50 hover:text-red-700"
              >
                Clear
              </button>
              <button
                type="button"
                disabled={!draft.from}
                onClick={() => void apply(draft)}
                className="rounded-full bg-red-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                Set date
              </button>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

export { selectionFromTask };
