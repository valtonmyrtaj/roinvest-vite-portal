export function SkeletonRows({
  rows = 4,
  className,
}: {
  rows?: number;
  className?: string;
}) {
  return (
    <div className={["space-y-3", className].filter(Boolean).join(" ")}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="h-[13px] w-[44%] animate-pulse rounded-full bg-[#eef1f5]" />
          <div className="h-[13px] w-[22%] animate-pulse rounded-full bg-[#f3f5f8]" />
          <div className="ml-auto h-[13px] w-[14%] animate-pulse rounded-full bg-[#f3f5f8]" />
        </div>
      ))}
    </div>
  );
}
