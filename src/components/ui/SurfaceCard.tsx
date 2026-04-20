import type { CSSProperties, ReactNode } from "react";
import {
  SURFACE_BG,
  SURFACE_BORDER,
  SURFACE_SHADOW_PANEL,
  SURFACE_SHADOW_SUBTLE,
} from "../../ui/tokens";

const paddingClassMap = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
} as const;

const variantStyleMap = {
  subtle: {
    borderRadius: 18,
    boxShadow: SURFACE_SHADOW_SUBTLE,
  },
  panel: {
    borderRadius: 20,
    boxShadow: SURFACE_SHADOW_PANEL,
  },
} as const;

export function SurfaceCard({
  children,
  className = "",
  variant = "subtle",
  padding = "none",
  style,
}: {
  children: ReactNode;
  className?: string;
  variant?: keyof typeof variantStyleMap;
  padding?: keyof typeof paddingClassMap;
  style?: CSSProperties;
}) {
  const variantStyle = variantStyleMap[variant];
  const paddingClass = paddingClassMap[padding];

  return (
    <div
      className={`border bg-white ${paddingClass} ${className}`.trim()}
      style={{
        background: SURFACE_BG,
        borderColor: SURFACE_BORDER,
        borderRadius: variantStyle.borderRadius,
        boxShadow: variantStyle.boxShadow,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
