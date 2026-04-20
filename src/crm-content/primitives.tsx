import type { ReactNode } from "react";
import { SurfaceCard } from "../components/ui/SurfaceCard";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <SurfaceCard className={className}>{children}</SurfaceCard>;
}
