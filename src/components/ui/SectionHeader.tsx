import type { ReactNode } from "react";
import { NAVY } from "../../ui/tokens";

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  right,
  className = "",
  titleClassName = "",
  subtitleClassName = "",
  eyebrowClassName = "",
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  eyebrowClassName?: string;
}) {
  return (
    <div className={`mb-5 flex flex-wrap items-start justify-between gap-4 ${className}`.trim()}>
      <div>
        {eyebrow ? (
          <p
            className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/30 ${eyebrowClassName}`.trim()}
          >
            {eyebrow}
          </p>
        ) : null}
        <p
          className={`text-[20px] font-bold leading-tight ${titleClassName}`.trim()}
          style={!titleClassName ? { color: NAVY } : undefined}
        >
          {title}
        </p>
        {subtitle ? (
          <p
            className={`mt-[2px] text-[13px] font-normal leading-snug ${subtitleClassName}`.trim()}
            style={!subtitleClassName ? { color: "#9ca3af" } : undefined}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {right}
    </div>
  );
}
