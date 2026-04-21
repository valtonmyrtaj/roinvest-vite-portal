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
  titleStyle,
  subtitleStyle,
  tone = "brand",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  bodyClassName?: string;
  titleStyle?: CSSProperties;
  subtitleStyle?: CSSProperties;
  tone?: SecondaryHeaderTone;
}) {
  const toneStyles = SECONDARY_HEADER_TONE_STYLES[tone];

  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-[#eef0f4] px-5 py-4 ${className}`.trim()}
    >
      <div className={`min-w-0 ${bodyClassName}`.trim()}>
        <p
          className={`text-[14px] font-semibold leading-[1.25] tracking-[-0.02em] ${titleClassName}`.trim()}
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
      {right}
    </div>
  );
}
