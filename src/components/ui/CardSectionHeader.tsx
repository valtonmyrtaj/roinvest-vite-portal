import type { CSSProperties, ReactNode } from "react";
import {
  SECONDARY_HEADER_TONE_STYLES,
  type SecondaryHeaderTone,
} from "./secondaryHeaderTone";

export function CardSectionHeader({
  title,
  subtitle,
  right,
  className = "",
  titleClassName = "",
  subtitleClassName = "",
  bodyClassName = "",
  rightClassName = "",
  titleStyle,
  subtitleStyle,
  tone = "brand",
  size = "sm",
  density = "regular",
  align = "start",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  bodyClassName?: string;
  rightClassName?: string;
  titleStyle?: CSSProperties;
  subtitleStyle?: CSSProperties;
  tone?: SecondaryHeaderTone;
  size?: "sm" | "md";
  density?: "compact" | "regular" | "spacious";
  align?: "start" | "center";
}) {
  const toneStyles = SECONDARY_HEADER_TONE_STYLES[tone];
  const titleSizeClass =
    size === "md"
      ? "text-[18px] font-semibold leading-tight tracking-[-0.03em]"
      : "text-[14px] font-semibold leading-[1.25] tracking-[-0.02em]";
  const densityClass = {
    compact: "px-5 py-3.5",
    regular: "px-5 py-4",
    spacious: "px-6 py-5",
  }[density];
  const alignClass = align === "center" ? "items-center" : "items-start";

  return (
    <div
      className={`flex flex-wrap ${alignClass} justify-between gap-x-4 gap-y-3 border-b border-[#eef0f4] ${densityClass} ${className}`.trim()}
    >
      <div className={`min-w-0 ${bodyClassName}`.trim()}>
        <p
          className={`${titleSizeClass} ${titleClassName}`.trim()}
          style={{ ...toneStyles.title, ...titleStyle }}
        >
          {title}
        </p>
        {subtitle ? (
          <p
            className={`mt-1 text-[12px] leading-[1.38] ${subtitleClassName}`.trim()}
            style={{ ...toneStyles.subtitle, ...subtitleStyle }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {right ? <div className={`shrink-0 ${rightClassName}`.trim()}>{right}</div> : null}
    </div>
  );
}
