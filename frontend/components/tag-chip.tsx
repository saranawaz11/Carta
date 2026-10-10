const TAG_TONES = [
  "bg-purple-100 text-purple-800",
  "bg-emerald-100 text-emerald-800",
  "bg-sky-100 text-sky-800",
  "bg-amber-100 text-amber-800",
  "bg-pink-100 text-pink-800",
  "bg-orange-100 text-orange-800",
];

// Same label always gets the same color, so real tags will be colored automatically
export function tagTone(label: string): string {
  let hash = 0;
  for (const char of label) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TAG_TONES[hash % TAG_TONES.length];
}

export function TagChip({ label }: { label: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ${tagTone(label)}`}
    >
      #{label}
    </span>
  );
}