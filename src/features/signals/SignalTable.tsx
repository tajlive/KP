"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";

interface Signal {
  id: string;
  title?: string;
  symbol?: string;
  direction?: string;
  signal_type?: string;
  price?: number;
  created_at: string;
  confidence?: number;
  status?: string;
  description?: string;
}

interface SignalTableProps {
  onRefresh?: () => void;
}

type FilterType = "all" | "pending" | "approved" | "rejected";

const filterLabels: Record<FilterType, string> = {
  all: "Alle",
  pending: "Venter",
  approved: "Godkjent",
  rejected: "Avslått",
};

const statusLabels: { [key: string]: string } = {
  pending: "Venter",
  approved: "Godkjent",
  rejected: "Avslått",
};

export default function SignalTable({
  onRefresh: _onRefresh,
}: SignalTableProps) {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");

  useEffect(() => {
    fetchSignals();
  }, []);

  const fetchSignals = async () => {
    setIsLoading(true);
    setError("");

    try {
      let query = supabase.from("signals").select("*");

      if (filter !== "all") {
        query = query.eq("status", filter);
      }

      const { data, error: fetchError } = await query.order("created_at", {
        ascending: false,
      });

      if (fetchError) {
        setError("Kunne ikke laste signaler");
        console.error("Fetch error:", fetchError);
        return;
      }

      setSignals(((data || []) as Signal[]));
    } catch (err) {
      setError("En feil oppstod under henting av data");
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setSignals([]);
    fetchSignals();
  };

  const getStatusBadgeClass = (status: string | undefined) => {
    const classes: { [key: string]: string } = {
      pending: "kp-badge-pending",
      approved: "kp-badge-approved",
      rejected: "kp-badge-rejected",
    };
    return classes[status as keyof typeof classes];
  };

  const getDirectionBadgeClass = (direction: string | undefined) => {
    return direction === "long" ? "kp-badge-info" : "kp-badge-error";
  };

  return (
    <div id="signals-list" className="kp-flex kp-flex-col kp-gap-4">
      {/* Filters */}
      <div id="signals-filter" className="kp-flex kp-gap-2 flex-wrap">
        {(["all", "pending", "approved", "rejected"] as const).map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={`kp-button ${filter === f ? "kp-button-primary" : "kp-button-secondary"}`}
          >
            {filterLabels[f]}
          </button>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <div className="kp-alert kp-alert-error">
          <svg
            className="kp-alert-icon"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <div className="kp-alert-content">
            <div className="kp-alert-message">{error}</div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div
          id="signals-loading"
          className="kp-flex kp-flex-col kp-items-center kp-justify-center p-12"
        >
          <span className="kp-spinner kp-spinner-lg text-primary" />
          <p className="kp-text-secondary kp-mt-4">Laster signaler...</p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && signals.length === 0 && (
        <div className="kp-card text-center p-12">
          <p className="kp-text-secondary kp-mb-2">Ingen signaler funnet</p>
          <p className="kp-text-sm kp-text-muted">
            Signaler vises her når de er opprettet
          </p>
        </div>
      )}

      {/* Signal cards */}
      {!isLoading && signals.length > 0 && (
        <div className="kp-table-responsive">
          <table className="kp-table">
            <thead>
              <tr>
                <th className="signal-asset">Tittel</th>
                <th className="signal-direction">Retning</th>
                <th>Selvtillit</th>
                <th className="signal-status">Status</th>
                <th className="signal-time">Dato</th>
              </tr>
            </thead>
            <tbody>
              {signals.map((signal) => (
                <tr key={signal.id} className="signal-card">
                  <td className="signal-asset kp-font-medium">
                    {signal.title || "Ingen tittel"}
                  </td>
                  <td className="signal-direction">
                    <span
                      className={`kp-badge ${getDirectionBadgeClass(signal.direction)}`}
                    >
                      {signal.direction === "long" ? "Long" : "Short"}
                    </span>
                  </td>
                  <td>
                    <div className="kp-flex kp-items-center kp-gap-2" role="img" aria-label={`Konfidens: ${signal.confidence}%`}>
                      <div className="w-12 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          ref={(el) => {
                            if (el) el.style.width = `${signal.confidence}%`;
                          }}
                        />
                      </div>
                      <span className="kp-text-sm kp-font-medium">
                        {signal.confidence}%
                      </span>
                    </div>
                  </td>
                  <td className="signal-status">
                    <span
                      className={`kp-badge ${getStatusBadgeClass(signal.status)}`}
                    >
                      {statusLabels[signal.status || "pending"]}
                    </span>
                  </td>
                  <td className="signal-time kp-text-secondary">
                    {new Date(signal.created_at).toLocaleDateString("no-NO")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
