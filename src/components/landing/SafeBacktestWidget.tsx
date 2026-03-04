"use client";

import dynamic from "next/dynamic";

const BacktestDemoWidget = dynamic(() => import("./BacktestDemoWidget"), {
  ssr: false,
  loading: () => (
    <div className="h-96 w-full bg-slate-50 dark:bg-slate-900 animate-pulse rounded-2xl" />
  ),
});

export default function SafeBacktestWidget() {
  return <BacktestDemoWidget />;
}
