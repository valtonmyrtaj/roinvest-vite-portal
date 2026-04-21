import type { CSSProperties, ReactNode } from "react";
import {
  SECONDARY_HEADER_TONE_STYLES,
  type SecondaryHeaderTone,
} from "./secondaryHeaderTone";
import { EyebrowLabel } from "./Eyebrow";

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  right,
  className = "",
  titleClassName = "",
  subtitleClassName = "",
  eyebrowClassName = "",
  titleStyle,
  subtitleStyle,
  eyebrowStyle,
  tone = "brand",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  eyebrowClassName?: string;
  titleStyle?: CSSProperties;
  subtitleStyle?: CSSProperties;
  eyebrowStyle?: CSSProperties;
  tone?: SecondaryHeaderTone;
}) {
  const toneStyles = SECONDARY_HEADER_TONE_STYLES[tone];

  return (
    <div className={`mb-5 flex flex-wrap items-start justify-between gap-4 ${className}`.trim()}>
      <div>
        {eyebrow ? (
          <EyebrowLabel
            as="p"
            className={`mb-1 ${eyebrowClassName}`.trim()}
            style={{ ...toneStyles.eyebrow, ...eyebrowStyle }}
          >
            {eyebrow}
          </EyebrowLabel>
        ) : null}
        <p
          className={`text-[18px] font-semibold leading-tight tracking-[-0.03em] ${titleClassName}`.trim()}
          style={{ ...toneStyles.title, ...titleStyle }}
        >
          {title}
        </p>
        {subtitle ? (
          <p
            className={`mt-1 text-[13px] leading-[1.38] ${subtitleClassName}`.trim()}
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
