import type { CSSProperties } from "react";
import { NAVY } from "../../ui/tokens";

export type SecondaryHeaderTone = "brand" | "neutral";

export const SECONDARY_HEADER_TONE_STYLES: Record<
  SecondaryHeaderTone,
  {
    title: CSSProperties;
    subtitle: CSSProperties;
    eyebrow: CSSProperties;
  }
> = {
  brand: {
    title: { color: NAVY },
    subtitle: { color: "rgba(0, 56, 131, 0.64)" },
    eyebrow: { color: "rgba(0, 56, 131, 0.42)" },
  },
  neutral: {
    title: { color: "rgba(15, 23, 42, 0.82)" },
    subtitle: { color: "rgba(15, 23, 42, 0.46)" },
    eyebrow: { color: "rgba(15, 23, 42, 0.3)" },
  },
};
