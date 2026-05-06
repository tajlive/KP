import { SURFACE, RADIUS } from "@/lib/design/tokens";

export function DashboardLoadingSkeleton() {
  return (
    <div className={`min-h-screen ${SURFACE.BG} p-6`}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div
          className={`h-8 ${SURFACE.BG_ELEVATED} ${RADIUS.input} animate-pulse w-1/3`}
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className={`h-24 ${SURFACE.BG_ELEVATED} ${RADIUS.card} animate-pulse`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
