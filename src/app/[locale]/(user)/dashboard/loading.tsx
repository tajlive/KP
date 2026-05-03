
export default function DashboardLoading() {
  return (
    <div className="min-h-screen p-4 pt-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded-xl" />
        <div className="h-10 w-10 bg-gray-200 dark:bg-gray-800 rounded-full" />
      </div>

      {/* Aggregate P&L card */}
      <div className="h-36 bg-gray-200 dark:bg-gray-800 rounded-2xl" />

      {/* Tab bar */}
      <div className="flex gap-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-10 w-24 bg-gray-200 dark:bg-gray-800 rounded-xl"
          />
        ))}
      </div>

      {/* Bot cards */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-44 bg-gray-200 dark:bg-gray-800 rounded-2xl"
          />
        ))}
      </div>
    </div>
  );
}
