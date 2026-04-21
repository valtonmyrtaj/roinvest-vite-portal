import type { CSSProperties, ElementType, ReactNode } from "react";
import { NAVY } from "../../ui/tokens";

type PageHeaderTone = "brand" | "neutral";

const PAGE_HEADER_TONE_STYLES: Record<
  PageHeaderTone,
  {
    title: CSSProperties;
    subtitle: CSSProperties;
    eyebrow: CSSProperties;
  }
> = {
  brand: {
    title: { color: NAVY },
    subtitle: { color: "rgba(0, 56, 131, 0.68)" },
    eyebrow: { color: "rgba(0, 56, 131, 0.42)" },
  },
  neutral: {
    title: { color: "rgba(0, 0, 0, 0.9)" },
    subtitle: { color: "rgba(0, 0, 0, 0.42)" },
    eyebrow: { color: "rgba(0, 0, 0, 0.3)" },
  },
};

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  right,
  as = "h1",
  className = "",
  bodyClassName = "",
  contentClassName = "",
  titleClassName = "",
  subtitleClassName = "",
  eyebrowClassName = "",
  rightClassName = "",
  titleStyle,
  subtitleStyle,
  eyebrowStyle,
  tone = "neutral",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  right?: ReactNode;
  as?: ElementType;
  className?: string;
  bodyClassName?: string;
  contentClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  eyebrowClassName?: string;
  rightClassName?: string;
  titleStyle?: CSSProperties;
  subtitleStyle?: CSSProperties;
  eyebrowStyle?: CSSProperties;
  tone?: PageHeaderTone;
}) {
  const TitleTag = as;
  const toneStyles = PAGE_HEADER_TONE_STYLES[tone];
  const resolvedTitleStyle = { ...toneStyles.title, ...titleStyle };
  const resolvedSubtitleStyle = { ...toneStyles.subtitle, ...subtitleStyle };
  const resolvedEyebrowStyle = { ...toneStyles.eyebrow, ...eyebrowStyle };

  return (
    <div className={`mb-8 flex flex-wrap items-end justify-between gap-4 ${className}`.trim()}>
      <div className={bodyClassName}>
        <div className={contentClassName}>
          {eyebrow ? (
            <p
              className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${eyebrowClassName}`.trim()}
              style={resolvedEyebrowStyle}
            >
              {eyebrow}
            </p>
          ) : null}
          <TitleTag
            className={`text-[24px] font-semibold tracking-[-0.03em] ${titleClassName}`.trim()}
            style={resolvedTitleStyle}
          >
            {title}
          </TitleTag>
          {subtitle ? (
            <p
              className={`mt-1 text-[13px] leading-[1.38] ${subtitleClassName}`.trim()}
              style={resolvedSubtitleStyle}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      {right ? <div className={rightClassName}>{right}</div> : null}
    </div>
  );
}
