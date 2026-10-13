#!/usr/bin/env bash
# Swaps Carta's hard-coded light colours for theme tokens so dark mode works.
# Safe to run more than once. Commit first so you can review the diff.
# Usage: bash dark-mode-migrate.sh [project-root]
set -euo pipefail
ROOT="${1:-.}"

DIRS=()
for d in app components src; do [ -d "$ROOT/$d" ] && DIRS+=("$ROOT/$d"); done
[ ${#DIRS[@]} -gt 0 ] || { echo "No app/, components/ or src/ folder under $ROOT"; exit 1; }

find "${DIRS[@]}" -type f \( -name '*.tsx' -o -name '*.ts' \) -not -path '*/node_modules/*' -exec perl -pi -e '
  s/(?<![\w-])bg-white(?![\w-])/bg-panel/g;
  s/(?<![\w-])bg-\[#fff6f3\]/bg-page/g;
  s/(?<![\w-])bg-\[#fffaf8\]/bg-surface/g;
  s/(?<![\w-])bg-\[#f6ebe7\]/bg-chrome/g;
  s/(?<![\w-])bg-\[#(?:f7eeea|f9eeea|fff1ee)\]/bg-band/g;
  s/(?<![\w-])bg-\[#fbe6e1\]/bg-tint/g;
  s/(?<![\w-])bg-\[#f6efe9\]/bg-sand/g;
  s/(?<![\w-])bg-\[#efe3dc\]/bg-art-ground/g;
  s/(?<![\w-])border-\[#f0c9c0\]/border-tint-edge/g;
  s/(?<![\w-])text-\[#1f1a1a\]/text-ink/g;
  s/(?<![\w-])border-red-900\/10(?![\w-])/border-line/g;
  s/(?<![\w-])border-red-900\/15(?![\w-])/border-line-strong/g;
  s/(?<![\w-])bg-red-900\/15(?![\w-])/bg-line-strong/g;
  s/(?<![\w-])bg-red-900\/(?:5|10)(?![\w-])/bg-line/g;
  s/(?<![\w-])text-red-800(?![\w-])/text-brand/g;
  s/(?<![\w-])text-red-900(?![\w-])/text-brand-strong/g;
  s/#e7c4bb/var(--carta-scroll)/g;
' {} +

# Clerk form colours follow the tokens too
find "${DIRS[@]}" -type f -name 'clerk-appearance.ts' -exec perl -pi -e '
  s/colorText: "#1f1a1a"/colorText: "var(--carta-ink)"/;
  s/colorTextSecondary: "#6b7280"/colorTextSecondary: "var(--carta-muted)"/;
  s/colorBackground: "#fffaf8"/colorBackground: "var(--carta-surface)"/;
  s/colorInputBackground: "#ffffff"/colorInputBackground: "var(--carta-panel)"/;
  s/colorInputText: "#1f1a1a"/colorInputText: "var(--carta-ink)"/;
' {} +

echo "Done. Colours still hard-coded as hex (className, fill, stroke or style). Light mode keeps them,"
echo "but each one needs a token (or a dark: variant) to change in dark mode:"
grep -rnE '#[0-9a-fA-F]{6}\b' "${DIRS[@]}" --include='*.tsx' --exclude='cursor-dot.tsx' || echo "  none"