"use client";

import { useRouter } from "next/navigation";
import { usePullToRefresh } from "@/hooks/use-pull-to-refresh";
import { PullToRefreshIndicator } from "./PullToRefreshIndicator";

interface Props {
  children: React.ReactNode;
}

export function MobilePullToRefreshWrapper({ children }: Props) {
  const router = useRouter();

  const { state, handlers, style } = usePullToRefresh({
    onRefresh: async () => {
      router.refresh();
      // Give Next.js a tick to kick off the server refetch.
      await new Promise((resolve) => setTimeout(resolve, 300));
    },
    threshold: 80,
    hapticPattern: "medium",
  });

  return (
    <div
      className="md:hidden"
      onTouchStart={handlers.onTouchStart}
      onTouchMove={handlers.onTouchMove}
      onTouchEnd={handlers.onTouchEnd}
      style={style}
    >
      <PullToRefreshIndicator
        distance={state.distance}
        ready={state.isReadyToRelease}
        refreshing={state.isRefreshing}
      />
      {children}
    </div>
  );
}
