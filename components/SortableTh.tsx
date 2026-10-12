import { ReactNode } from "react";
import { SortDir } from "../lib/documentSort";

function SortIcon({ dir }: { dir: SortDir | null }) {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" aria-hidden="true" className="shrink-0">
      <path d="M5 1 L9 6 H1 Z" className={dir === "asc" ? "fill-accent-400" : "fill-white/40"} />
      <path d="M5 13 L1 8 H9 Z" className={dir === "desc" ? "fill-accent-400" : "fill-white/40"} />
    </svg>
  );
}

// Table header cell. Pass `onSort` to make it a clickable sort button with arrows.
export default function SortableTh({
  children,
  sortDir,
  onSort,
  className = "",
}: {
  children: ReactNode;
  sortDir?: SortDir | null;
  onSort?: () => void;
  className?: string;
}) {
  const ariaSort = onSort
    ? sortDir === "asc"
      ? "ascending"
      : sortDir === "desc"
        ? "descending"
        : "none"
    : undefined;

  return (
    <th
      aria-sort={ariaSort}
      className={`whitespace-nowrap px-4 py-4 text-xs font-semibold uppercase tracking-wider ${className}`}
    >
      {onSort ? (
        <button
          type="button"
          onClick={onSort}
          className="inline-flex items-center gap-1.5 rounded font-semibold uppercase tracking-wider transition-colors hover:text-accent-400 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent-400"
        >
          {children}
          <SortIcon dir={sortDir ?? null} />
        </button>
      ) : (
        children
      )}
    </th>
  );
}