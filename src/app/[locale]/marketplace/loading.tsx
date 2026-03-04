"use client";

export default function MarketplaceLoading() {
  return (
    <div className="min-h-screen p-4 pt-6 space-y-6 animate-pulse">
      {/* Search bar */}
      <div className="h-12 bg-gray-200 dark:bg-gray-800 rounded-xl" />

      {/* Filter chips */}
      <div className="flex gap-2 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-8 w-20 bg-gray-200 dark:bg-gray-800 rounded-full flex-shrink-0"
          />
        ))}
      </div>

      {/* Strategy cards */}
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl"
          />
        ))}
      </div>
    </div>
  );
}
