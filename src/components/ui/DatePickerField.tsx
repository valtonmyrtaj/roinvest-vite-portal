import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

const NAVY = "#003883";
const MONTHS_SQ = [
  "Janar",
  "Shkurt",
  "Mars",
  "Prill",
  "Maj",
  "Qershor",
  "Korrik",
  "Gusht",
  "Shtator",
  "Tetor",
  "Nëntor",
  "Dhjetor",
];
const WEEKDAYS_SQ = ["H", "M", "M", "E", "P", "Sh", "D"];
const REGULAR_POPOVER_HEIGHT = 330;
const COMPACT_POPOVER_HEIGHT = 286;
const REGULAR_POPOVER_WIDTH = 286;
const COMPACT_POPOVER_WIDTH = 268;

const SIZE = {
  sm: { height: "h-[34px]", text: "text-[12px]", rounded: "rounded-[10px]", px: "px-3", icon: 13 },
  md: { height: "h-10", text: "text-[13px]", rounded: "rounded-[11px]", px: "px-3", icon: 14 },
  lg: { height: "h-[46px]", text: "text-[13px]", rounded: "rounded-[14px]", px: "px-4", icon: 15 },
} as const;

type DateParts = {
  year: number;
  month: number;
  day: number;
};

export interface DatePickerFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  min?: string;
  max?: string;
  required?: boolean;
  clearable?: boolean;
  id?: string;
  label?: ReactNode;
  labelClassName?: string;
  portal?: boolean;
}

function pad2(value: number) {
  return String(value).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function getTodayParts(): DateParts {
  const today = new Date();
  return {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    day: today.getDate(),
  };
}

function getTodayIso() {
  const today = getTodayParts();
  return toIsoDate(today.year, today.month, today.day);
}

function parseIsoDate(value?: string | null): DateParts | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;

  return { year, month, day };
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function mondayFirstOffset(year: number, month: number) {
  const nativeDay = new Date(year, month - 1, 1).getDay();
  return nativeDay === 0 ? 6 : nativeDay - 1;
}

function addMonths(year: number, month: number, delta: number) {
  const next = new Date(year, month - 1 + delta, 1);
  return {
    year: next.getFullYear(),
    month: next.getMonth() + 1,
  };
}

function formatDisplay(value?: string | null) {
  const parsed = parseIsoDate(value);
  if (!parsed) return "";
  return `${parsed.day} ${MONTHS_SQ[parsed.month - 1]} ${parsed.year}`;
}

function isOutOfRange(iso: string, min?: string, max?: string) {
  if (min && iso < min) return true;
  if (max && iso > max) return true;
  return false;
}

export function DatePickerField({
  value,
  onChange,
  placeholder = "Zgjidh datën",
  size = "md",
  className = "",
  disabled = false,
  min,
  max,
  required = false,
  clearable,
  id,
  label,
  labelClassName = "mb-1 block text-[12px] font-semibold text-black/55",
  portal = false,
}: DatePickerFieldProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const selected = parseIsoDate(value);
  const todayIso = getTodayIso();
  const today = parseIsoDate(todayIso) ?? getTodayParts();
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<"top" | "bottom">("bottom");
  const [density, setDensity] = useState<"regular" | "compact">("regular");
  const [align, setAlign] = useState<"left" | "right">("left");
  const [portalPosition, setPortalPosition] = useState<{ top: number; left: number } | null>(null);
  const [view, setView] = useState(() => ({
    year: selected?.year ?? today.year,
    month: selected?.month ?? today.month,
  }));
  const s = SIZE[size];
  const hasValue = Boolean(value);
  const canClear = clearable ?? (hasValue && !required);

  const updatePopoverLayout = useCallback(() => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect) return;

    const viewportPadding = 8;
    const gutter = 6;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const fitsRegularBelow = spaceBelow >= REGULAR_POPOVER_HEIGHT;
    const fitsCompactBelow = spaceBelow >= COMPACT_POPOVER_HEIGHT;
    const nextPlacement =
      fitsRegularBelow || fitsCompactBelow || spaceBelow >= spaceAbove ? "bottom" : "top";
    const availableHeight = nextPlacement === "bottom" ? spaceBelow : spaceAbove;
    const nextDensity = availableHeight >= REGULAR_POPOVER_HEIGHT ? "regular" : "compact";
    const nextWidth = nextDensity === "regular" ? REGULAR_POPOVER_WIDTH : COMPACT_POPOVER_WIDTH;
    const nextHeight = nextDensity === "regular" ? REGULAR_POPOVER_HEIGHT : COMPACT_POPOVER_HEIGHT;
    const nextAlign =
      window.innerWidth - rect.left < nextWidth && rect.right >= nextWidth ? "right" : "left";

    setPlacement(nextPlacement);
    setDensity(nextDensity);
    setAlign(nextAlign);

    if (!portal) return;

    const unclampedLeft = nextAlign === "right" ? rect.right - nextWidth : rect.left;
    const unclampedTop =
      nextPlacement === "bottom" ? rect.bottom + gutter : rect.top - nextHeight - gutter;

    setPortalPosition({
      left: Math.max(
        viewportPadding,
        Math.min(window.innerWidth - nextWidth - viewportPadding, unclampedLeft),
      ),
      top: Math.max(
        viewportPadding,
        Math.min(window.innerHeight - nextHeight - viewportPadding, unclampedTop),
      ),
    });
  }, [portal]);

  useEffect(() => {
    if (!open) return;

    const handleMouseDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current &&
        !rootRef.current.contains(target) &&
        !popoverRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !portal) return;

    const handleViewportChange = () => updatePopoverLayout();

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("scroll", handleViewportChange, true);
    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("scroll", handleViewportChange, true);
    };
  }, [open, portal, updatePopoverLayout]);

  const calendarDays = useMemo(() => {
    const offset = mondayFirstOffset(view.year, view.month);
    const currentMonthDays = daysInMonth(view.year, view.month);
    const previous = addMonths(view.year, view.month, -1);
    const previousMonthDays = daysInMonth(previous.year, previous.month);
    const days: Array<{ iso: string; day: number; inMonth: boolean; disabled: boolean }> = [];

    for (let index = 0; index < 42; index += 1) {
      const dayNumber = index - offset + 1;
      let year = view.year;
      let month = view.month;
      let day = dayNumber;
      let inMonth = true;

      if (dayNumber < 1) {
        year = previous.year;
        month = previous.month;
        day = previousMonthDays + dayNumber;
        inMonth = false;
      } else if (dayNumber > currentMonthDays) {
        const next = addMonths(view.year, view.month, 1);
        year = next.year;
        month = next.month;
        day = dayNumber - currentMonthDays;
        inMonth = false;
      }

      const iso = toIsoDate(year, month, day);
      days.push({
        iso,
        day,
        inMonth,
        disabled: !inMonth || isOutOfRange(iso, min, max),
      });
    }

    return days;
  }, [max, min, view.month, view.year]);

  const selectedIso = selected ? toIsoDate(selected.year, selected.month, selected.day) : null;

  const selectDate = (iso: string) => {
    if (isOutOfRange(iso, min, max)) return;
    onChange(iso);
  };

  const setToday = () => {
    if (isOutOfRange(todayIso, min, max)) return;
    onChange(todayIso);
  };

  const toggleOpen = () => {
    if (open) {
      setOpen(false);
      return;
    }

    setView({
      year: selected?.year ?? today.year,
      month: selected?.month ?? today.month,
    });

    updatePopoverLayout();
    setOpen(true);
  };

  const opensAbove = placement === "top";
  const compact = density === "compact";
  const popoverWidthClass = compact ? "w-[268px] p-2.5" : "w-[286px] p-3";
  const popoverPositionClass = portal
    ? "fixed z-[9999]"
    : `absolute z-[70] ${
        opensAbove ? "bottom-[calc(100%+6px)]" : "top-[calc(100%+6px)]"
      } ${align === "right" ? "right-0" : "left-0"}`;

  const popover = (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={popoverRef}
          initial={{ opacity: 0, scale: 0.97, y: opensAbove ? 4 : -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: opensAbove ? 4 : -4 }}
          transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
          className={`${popoverPositionClass} rounded-[16px] border border-[#e8e8ec] bg-white shadow-[0_16px_36px_rgba(16,24,40,0.13)] ${popoverWidthClass}`}
          style={portal && portalPosition ? portalPosition : undefined}
        >
          <div className={`${compact ? "mb-2" : "mb-3"} flex items-center justify-between gap-2`}>
            <p className="text-[13px] tracking-[-0.01em]" style={{ color: NAVY, fontWeight: 750 }}>
              {MONTHS_SQ[view.month - 1]} {view.year}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setView((current) => addMonths(current.year, current.month, -1))}
                className="flex h-8 w-8 items-center justify-center rounded-[9px] text-black/45 transition hover:bg-[#f5f7fb] hover:text-black/70"
                aria-label="Muaji i kaluar"
              >
                <ChevronLeft size={15} strokeWidth={2.2} />
              </button>
              <button
                type="button"
                onClick={() => setView((current) => addMonths(current.year, current.month, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-[9px] text-black/45 transition hover:bg-[#f5f7fb] hover:text-black/70"
                aria-label="Muaji tjetër"
              >
                <ChevronRight size={15} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1">
            {WEEKDAYS_SQ.map((day, index) => (
              <div key={`${day}-${index}`} className={`flex ${compact ? "h-6" : "h-7"} items-center justify-center text-[10px] font-semibold text-black/32`}>
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const selectedDay = day.iso === selectedIso;
              const todayDay = day.iso === todayIso;

              return (
                <button
                  key={day.iso}
                  type="button"
                  disabled={day.disabled}
                  onClick={() => selectDate(day.iso)}
                  className={`relative flex ${compact ? "h-7" : "h-8"} items-center justify-center rounded-[9px] text-[12px] transition disabled:cursor-default`}
                  style={{
                    backgroundColor: selectedDay ? NAVY : "transparent",
                    color: selectedDay
                      ? "white"
                      : day.disabled
                      ? "rgba(0,0,0,0.24)"
                      : todayDay
                      ? NAVY
                      : "rgba(0,0,0,0.76)",
                    fontWeight: selectedDay || todayDay ? 700 : 500,
                    boxShadow: todayDay && !selectedDay ? `inset 0 0 0 1px ${NAVY}33` : "none",
                  }}
                >
                  <span>{day.day}</span>
                </button>
              );
            })}
          </div>

          <div className={`${compact ? "mt-2 pt-2" : "mt-3 pt-3"} flex items-center justify-between border-t border-black/[0.06]`}>
            {canClear ? (
              <button
                type="button"
                onClick={() => {
                  onChange(null);
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[12px] font-semibold text-black/42 transition hover:bg-[#f5f7fb] hover:text-black/65"
              >
                <X size={12} strokeWidth={2.2} />
                Pastro
              </button>
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={setToday}
              disabled={isOutOfRange(todayIso, min, max)}
              className="h-8 rounded-[9px] px-3 text-[12px] font-semibold transition hover:bg-[#f5f7fb] disabled:cursor-not-allowed disabled:opacity-40"
              style={{ color: NAVY }}
            >
              Sot
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      {label ? (
        <label htmlFor={id} className={labelClassName}>
          {label}
          {required && <span className="ml-0.5 text-[#b14b4b]">*</span>}
        </label>
      ) : null}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className={`flex ${s.height} w-full items-center justify-between gap-2 ${s.rounded} border bg-white ${s.px} ${s.text} outline-none transition-all duration-150 hover:-translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 ${
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
        <span className="truncate">{hasValue ? formatDisplay(value) : placeholder}</span>
        <CalendarDays size={s.icon} strokeWidth={2.1} className="shrink-0 text-black/35" />
      </button>

      {portal && typeof document !== "undefined"
        ? createPortal(popover, document.body)
        : popover}
    </div>
  );
}
