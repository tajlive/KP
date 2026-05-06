import { cn } from "@/lib/utils";

export type SkeletonVariant =
  | "text"
  | "heading"
  | "card"
  | "chart"
  | "kpi"
  | "avatar"
  | "badge";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  width?: string | number;
  height?: string | number;
  className?: string;
  lines?: number;
}

const variantHeights: Record<SkeletonVariant, string> = {
  text: "1em",
  heading: "1.5em",
  card: "80px",
  chart: "200px",
  kpi: "72px",
  avatar: "40px",
  badge: "24px",
};

const variantWidths: Record<SkeletonVariant, string | undefined> = {
  text: "100%",
  heading: "60%",
  card: "100%",
  chart: "100%",
  kpi: "100%",
  avatar: "40px",
  badge: "64px",
};

const variantBorderRadius: Record<SkeletonVariant, string | undefined> = {
  text: "6px",
  heading: "6px",
  card: "12px",
  chart: "12px",
  kpi: "12px",
  avatar: "50%",
  badge: "999px",
};

function toCssValue(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "number") return `${value}px`;
  return value;
}

export function Skeleton({
  variant = "text",
  width,
  height,
  className,
  lines = 3,
  style,
  ...props
}: SkeletonProps) {
  const finalWidth = toCssValue(width) ?? variantWidths[variant] ?? "100%";
  const finalHeight = toCssValue(height) ?? variantHeights[variant];
  const borderRadius = variantBorderRadius[variant] ?? "6px";

  if (variant === "text" && lines > 1) {
    return (
      <div className="flex flex-col gap-2" {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn("skeleton-shimmer", className)}
            style={{
              width: finalWidth,
              height: finalHeight,
              borderRadius,
              ...style,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn("skeleton-shimmer", className)}
      style={{
        width: finalWidth,
        height: finalHeight,
        borderRadius,
        ...style,
      }}
      {...props}
    />
  );
}

export function SkeletonDashboard() {
  return (
    <div
      className="space-y-6"
      style={{
        padding: "12px",
        paddingBottom: "calc(5.75rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {/* KPI-rad: 3 × skeleton-kpi */}
      <div className="grid grid-cols-3 gap-3">
        <Skeleton variant="kpi" />
        <Skeleton variant="kpi" />
        <Skeleton variant="kpi" />
      </div>

      {/* Chart-seksjon */}
      <Skeleton variant="chart" height="220px" />

      {/* "Siste handler"-heading */}
      <Skeleton variant="heading" />

      {/* Trade-liste: 5 × skeleton-card */}
      <div className="flex flex-col gap-3">
        <Skeleton variant="card" height="56px" />
        <Skeleton variant="card" height="56px" />
        <Skeleton variant="card" height="56px" />
        <Skeleton variant="card" height="56px" />
        <Skeleton variant="card" height="56px" />
      </div>
    </div>
  );
}
