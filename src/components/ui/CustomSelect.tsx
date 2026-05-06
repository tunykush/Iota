"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface CustomSelectProps {
  id?: string;
  value: string;
  options: readonly string[];
  onChange?: (value: string) => void;
  className?: string;
}

export function CustomSelect({ id, value, options, onChange, className = "" }: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSelect = useCallback((option: string) => {
    setSelected(option);
    setOpen(false);
    onChange?.(option);
  }, [onChange]);

  return (
    <div
      ref={ref}
      className={`custom-select-root ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Trigger */}
      <button
        type="button"
        id={id}
        className={`custom-select-trigger auth-input ${open ? "custom-select-trigger--open" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="flex-1 text-left truncate">{selected}</span>
        <svg
          className={`custom-select-chevron ${open ? "custom-select-chevron--open" : ""}`}
          width="12" height="12" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <ul
          role="listbox"
          className="custom-select-panel"
          aria-label="Options"
        >
          {options.map((option, i) => (
            <li
              key={option}
              role="option"
              aria-selected={option === selected}
              className={`custom-select-option ${option === selected ? "custom-select-option--active" : ""}`}
              style={{ "--i": i } as React.CSSProperties}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(option);
              }}
            >
              {option === selected && (
                <svg className="w-3 h-3 shrink-0 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              )}
              <span className={option === selected ? "" : "ml-[18px]"}>{option}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
