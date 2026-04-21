import type { CSSProperties, ElementType, ReactNode } from "react";

export function EyebrowLabel({
  children,
  as = "span",
  className = "",
  style,
}: {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}) {
  const Tag = as;

  return (
    <Tag
      className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${className}`.trim()}
      style={style}
    >
      {children}
    </Tag>
  );
}

export function SectionEyebrow({
  label,
  detail,
  className = "",
  labelClassName = "",
  detailClassName = "",
  ruleClassName = "",
  labelStyle,
}: {
  label: ReactNode;
  detail?: ReactNode;
  className?: string;
  labelClassName?: string;
  detailClassName?: string;
  ruleClassName?: string;
  labelStyle?: CSSProperties;
}) {
  return (
    <div className={className}>
      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <EyebrowLabel
          className={`text-black/35 ${labelClassName}`.trim()}
          style={labelStyle}
        >
          {label}
        </EyebrowLabel>
        {detail ? (
          <span className={`text-[11px] text-black/25 ${detailClassName}`.trim()}>
            {"— "}
            {detail}
          </span>
        ) : null}
      </div>
      <div className={`h-px bg-black/[0.06] ${ruleClassName}`.trim()} />
    </div>
  );
}

export function CenteredEyebrowDivider({
  label,
  className = "",
  labelClassName = "",
  lineClassName = "",
  labelStyle,
}: {
  label: ReactNode;
  className?: string;
  labelClassName?: string;
  lineClassName?: string;
  labelStyle?: CSSProperties;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <div className={`h-px flex-1 bg-black/[0.06] ${lineClassName}`.trim()} />
      <EyebrowLabel
        className={`text-[10.5px] text-black/30 ${labelClassName}`.trim()}
        style={labelStyle}
      >
        {label}
      </EyebrowLabel>
      <div className={`h-px flex-1 bg-black/[0.06] ${lineClassName}`.trim()} />
    </div>
  );
}
