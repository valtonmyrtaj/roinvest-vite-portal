import type { CSSProperties, ReactNode } from "react";

const sizeClassMap = {
  xs: "px-2.5 py-[3px] text-[10.5px]",
  sm: "px-2.5 py-1 text-[10px]",
} as const;

const weightClassMap = {
  normal: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
} as const;

export function PillBadge({
  children,
  className = "",
  style,
  size = "xs",
  weight = "semibold",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  size?: keyof typeof sizeClassMap;
  weight?: keyof typeof weightClassMap;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full ${sizeClassMap[size]} ${weightClassMap[weight]} ${className}`.trim()}
      style={style}
    >
      {children}
    </span>
  );
}
