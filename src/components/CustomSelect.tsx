import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

interface CustomSelectProps {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** sm = 34px, md = 40px (default), lg = 46px */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE = {
  sm: { height: "h-[34px]", text: "text-[12px]", rounded: "rounded-[10px]", pl: "pl-3",  pr: "pr-8",  chevron: 13 },
  md: { height: "h-10",     text: "text-[13px]", rounded: "rounded-[11px]", pl: "pl-3",  pr: "pr-9",  chevron: 14 },
  lg: { height: "h-[46px]", text: "text-[13px]", rounded: "rounded-[14px]", pl: "pl-4",  pr: "pr-10", chevron: 15 },
} as const;

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder,
  size = "md",
  className = "",
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const s = SIZE[size];
  const hasValue = value !== "";
  const safeOptions = Array.isArray(options) ? options : [];

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex ${s.height} w-full cursor-pointer items-center justify-between gap-2 ${s.rounded} border bg-white ${s.pl} ${s.pr} ${s.text} outline-none transition-all duration-200 hover:-translate-y-[1px] ${
          open
            ? "border-[#c8d3e8] shadow-[0_0_0_3px_rgba(0,56,131,0.06)]"
            : hasValue
            ? "border-[#d5deef]"
            : "border-[#e8e8ec]"
        }`}
        style={{
          color: hasValue ? "rgba(0,0,0,0.85)" : "rgba(0,0,0,0.45)",
          fontWeight: hasValue ? 500 : 400,
        }}
      >
        <span className="truncate">{hasValue ? value : (placeholder ?? "")}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.18, ease: "easeInOut" }}
          className="shrink-0"
        >
          <ChevronDown size={s.chevron} strokeWidth={2.2} className="text-black/40" />
        </motion.span>
      </button>

      {/* Dropdown list */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -4 }}
            transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-0 top-[calc(100%+5px)] z-50 max-h-[240px] min-w-full overflow-y-auto overscroll-contain rounded-[12px] border border-[#e8e8ec] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.10)]"
          >
            {/* Placeholder option */}
            {placeholder && (
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false); }}
                className={`flex w-full items-start ${s.pl} ${s.pr} py-2 text-left ${s.text} text-black/35 transition-colors hover:bg-[#f5f7fb]`}
              >
                <span className="flex-1 whitespace-normal text-left leading-[1.35]">{placeholder}</span>
              </button>
            )}

            {/* Regular options */}
            {safeOptions.map((opt) => {
              const selected = opt === value;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false); }}
                  className={`flex w-full items-start justify-between gap-2 ${s.pl} ${s.pr} py-2 text-left ${s.text} transition-colors hover:bg-[#f5f7fb]`}
                  style={{
                    color: selected ? "#003883" : "rgba(0,0,0,0.75)",
                    fontWeight: selected ? 600 : 400,
                  }}
                >
                  <span className="flex-1 whitespace-normal text-left leading-[1.35]">{opt}</span>
                  {selected && (
                    <Check size={12} strokeWidth={2.5} className="mt-[1px] shrink-0" style={{ color: "#003883" }} />
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
