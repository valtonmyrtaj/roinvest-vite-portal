import type { ReactNode } from "react";

export function CardSectionHeader({
  title,
  subtitle,
  right,
  className = "",
  titleClassName = "",
  subtitleClassName = "",
  bodyClassName = "",
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  bodyClassName?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 border-b border-[#eef0f4] px-5 py-4 ${className}`.trim()}
    >
      <div className={bodyClassName}>
        <p className={`text-[15px] font-semibold text-black/70 ${titleClassName}`.trim()}>
          {title}
        </p>
        {subtitle ? (
          <p className={`mt-0.5 text-[12px] text-black/38 ${subtitleClassName}`.trim()}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {right}
    </div>
  );
}
