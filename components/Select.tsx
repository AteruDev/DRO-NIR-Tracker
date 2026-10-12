"use client";

import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type SelectOption = { value: string; label: string; accent?: boolean };

type Pos = { left: number; minWidth: number; top?: number; bottom?: number; maxHeight: number };

// A styled dropdown that looks the same on every browser and operating system.
// Keyboard: ↑ ↓ Home End to move, Enter / Space to choose, Esc to close, or type a letter to jump.
export default function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  ariaLabel,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
  /** Sizing for the whole control, e.g. "w-44". Defaults to full width. */
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos | null>(null);
  const [active, setActive] = useState(0);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;

  function openMenu() {
    const r = btnRef.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const up = below < 200 && above > below; // flip upward when there's no room underneath
    setPos({
      left: Math.max(8, Math.min(r.left, window.innerWidth - Math.max(r.width, 220) - 8)),
      minWidth: r.width,
      maxHeight: Math.min(288, up ? above : below),
      ...(up ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
    });
    setActive(Math.max(0, selectedIndex));
    setOpen(true);
  }

  function choose(i: number) {
    onChange(options[i].value);
    setOpen(false);
    btnRef.current?.focus();
  }

  // Close on outside click, page scroll, or resize.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onScroll = (e: Event) => {
      if (listRef.current?.contains(e.target as Node)) return; // scrolling the list itself is fine
      setOpen(false);
    };
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  // Keep the highlighted option visible inside the list.
  useEffect(() => {
    if (!open) return;
    (listRef.current?.children[active] as HTMLElement | undefined)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActive((i) => Math.min(options.length - 1, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActive(0);
        break;
      case "End":
        e.preventDefault();
        setActive(options.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(active);
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1) {
          const k = e.key.toLowerCase();
          for (let step = 1; step <= options.length; step++) {
            const i = (active + step) % options.length;
            if (options[i].label.toLowerCase().startsWith(k)) {
              setActive(i);
              break;
            }
          }
        }
    }
  }

  return (
    <div className={className}>
      <button
        ref={btnRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-left text-sm outline-none transition-colors ${
          open
            ? "border-brand-600 ring-2 ring-brand-200"
            : "border-line hover:border-brand-300 focus-visible:border-brand-600 focus-visible:ring-2 focus-visible:ring-brand-200"
        }`}
      >
        <span className={`truncate ${selected ? "" : "text-muted"}`}>{selected?.label ?? placeholder}</span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-brand-600 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M5 8l5 5 5-5" />
        </svg>
      </button>

      {open &&
        pos &&
        createPortal(
          <ul
            ref={listRef}
            role="listbox"
            style={{
              position: "fixed",
              left: pos.left,
              top: pos.top,
              bottom: pos.bottom,
              minWidth: pos.minWidth,
              maxWidth: 320,
              maxHeight: pos.maxHeight,
            }}
            className="z-[60] overflow-y-auto rounded-xl border border-line bg-white py-1 text-sm shadow-xl"
          >
            {options.map((o, i) => {
              const isSelected = o.value === value;
              return (
                <li
                  key={`${o.value}-${i}`}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()} // keep keyboard focus on the button
                  onClick={() => choose(i)}
                  className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 ${
                    o.accent ? "border-t border-line font-semibold text-brand-700" : ""
                  } ${i === active ? `bg-brand-100 shadow-[inset_3px_0_0_0_#2563eb]${o.accent ? "" : " text-brand-900"}` : ""} ${isSelected && !o.accent ? "font-semibold text-brand-800" : ""}`}
                >
                  <span className="truncate">{o.label}</span>
                  {isSelected && (
                    <svg
                      viewBox="0 0 20 20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-brand-600"
                    >
                      <path d="M4 10.5l4 4 8-9" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>,
          document.body
        )}
    </div>
  );
}