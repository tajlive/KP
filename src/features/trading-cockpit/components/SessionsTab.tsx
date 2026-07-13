"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useCockpit } from "@/features/trading-cockpit/hooks/useCockpit";
import { SessionList } from "./SessionList";
import { TraderStatusLog } from "./TraderStatusLog";

export function SessionsTab() {
  const t = useTranslations("trading");
  const {
    mode,
    sessions,
    statusCounts,
    hasMoreSessions,
    loadMoreSessions,
  } = useCockpit();

  const selectedSessionId = React.useMemo(() => {
    const active = sessions.find(
      (s) => s.status === "active" && s.mode === mode,
    );
    return active?.id ?? sessions[0]?.id ?? null;
  }, [sessions, mode]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-kp-text-primary mb-4">
          {t("cockpit.sessions.title")}
        </h2>
        <SessionList
          sessions={sessions}
          statusCounts={statusCounts}
          hasMore={hasMoreSessions}
          onLoadMore={loadMoreSessions}
        />
      </div>
      {selectedSessionId && (
        <div>
          <h2 className="text-lg font-semibold text-kp-text-primary mb-4">
            {t("cockpit.statusLog.title")}
          </h2>
          <TraderStatusLog sessionId={selectedSessionId} mode={mode} />
        </div>
      )}
    </div>
  );
}
