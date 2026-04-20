import type { CSSProperties, ElementType, ReactNode } from "react";

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
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
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
}) {
  const TitleTag = as;

  return (
    <div className={`mb-8 flex flex-wrap items-end justify-between gap-4 ${className}`.trim()}>
      <div className={bodyClassName}>
        <div className={contentClassName}>
          {eyebrow ? (
            <p
              className={`mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-black/30 ${eyebrowClassName}`.trim()}
              style={eyebrowStyle}
            >
              {eyebrow}
            </p>
          ) : null}
          <TitleTag
            className={`text-[22px] font-semibold tracking-[-0.03em] text-black/90 ${titleClassName}`.trim()}
            style={titleStyle}
          >
            {title}
          </TitleTag>
          {subtitle ? (
            <p
              className={`mt-1 text-[13px] text-black/40 ${subtitleClassName}`.trim()}
              style={subtitleStyle}
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
