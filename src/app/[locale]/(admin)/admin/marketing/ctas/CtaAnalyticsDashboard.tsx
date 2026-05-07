"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  Calendar,
  MousePointer,
  Users,
  TrendingUp,
  Beaker,
  Filter,
  RefreshCw,
  Target,
  Zap,
} from "lucide-react";

interface CtaAggregate {
  tracking_id: string;
  route: string;
  total_clicks: number;
  unique_users: number;
  locale: string;
  experiment_key: string | null;
  variant_key: string | null;
  funnel_stage?: string;
  // Funnel metrics
  users_signed_up?: number;
  users_with_first_paper?: number;
  users_with_first_auto_trade?: number;
}

interface CtaEvent {
  tracking_id: string;
  route: string;
  locale: string;
  experiment_key: string | null;
  variant_key: string | null;
  funnel_stage: string | null;
  user_id: string | null;
}

interface FunnelSummary {
  tracking_id: string;
  variant_key: string | null;
  experiment_key: string | null;
  funnel_stage: string;
  total_clicks: number;
  users_signed_up: number;
  users_with_first_paper: number;
  users_with_first_auto_trade: number;
}

interface CtaAnalyticsDashboardProps {
  initialData: CtaAggregate[];
}

const timeRanges = [
  { label: "Siste 7 dager", value: 7 },
  { label: "Siste 30 dager", value: 30 },
  { label: "Siste 90 dager", value: 90 },
];

export function CtaAnalyticsDashboard({
  initialData,
}: CtaAnalyticsDashboardProps) {
  const [data, setData] = useState<CtaAggregate[]>(initialData);
  const [selectedRange, setSelectedRange] = useState(30);
  const [loading, setLoading] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<string | null>(null);
  const [showExperimentsOnly, setShowExperimentsOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'funnel'>('overview');

  const supabase = createClient();

  const fetchData = async (days: number) => {
    setLoading(true);
    try {
      // Try to get data from materialized view first
      const { data: funnelData, error: funnelError } = await supabase
        .from('marketing_funnel_summary' as 'user_profiles')
        .select('*')
        .gte('last_click_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .returns<FunnelSummary[]>();

      if (!funnelError && funnelData && funnelData.length > 0) {
        // Use funnel summary data
        const formattedData: CtaAggregate[] = funnelData.map(item => ({
          tracking_id: item.tracking_id,
          route: item.funnel_stage,
          total_clicks: item.total_clicks,
          unique_users: item.total_clicks, // Approximation
          locale: 'no',
          experiment_key: item.experiment_key,
          variant_key: item.variant_key,
          funnel_stage: item.funnel_stage,
          users_signed_up: item.users_signed_up,
          users_with_first_paper: item.users_with_first_paper,
          users_with_first_auto_trade: item.users_with_first_auto_trade,
        }));
        setData(formattedData);
      } else {
        // Fallback to raw events
        const { data: events } = await supabase
          .from('marketing_cta_events' as 'user_profiles')
          .select('tracking_id, route, locale, experiment_key, variant_key, funnel_stage, user_id')
          .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
          .returns<CtaEvent[]>();

        const aggregates = (events || []).reduce((acc, event) => {
          const key = `${event.tracking_id}-${event.route}-${event.locale}`;
          if (!acc[key]) {
            acc[key] = {
              tracking_id: event.tracking_id,
              route: event.route,
              total_clicks: 0,
              unique_users: new Set<string>(),
              locale: event.locale,
              experiment_key: event.experiment_key,
              variant_key: event.variant_key,
              funnel_stage: event.funnel_stage || 'general',
            };
          }
          acc[key].total_clicks++;
          if (event.user_id) {
            acc[key].unique_users.add(event.user_id);
          }
          return acc;
        }, {} as Record<string, {
          tracking_id: string;
          route: string;
          total_clicks: number;
          unique_users: Set<string>;
          locale: string;
          experiment_key: string | null;
          variant_key: string | null;
          funnel_stage: string;
        }>);

        const formattedData: CtaAggregate[] = Object.values(aggregates).map(item => ({
          tracking_id: item.tracking_id,
          route: item.route,
          total_clicks: item.total_clicks,
          unique_users: item.unique_users.size,
          locale: item.locale,
          experiment_key: item.experiment_key,
          variant_key: item.variant_key,
          funnel_stage: item.funnel_stage,
        }));

        setData(formattedData);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRangeChange = (days: number) => {
    setSelectedRange(days);
    fetchData(days);
  };

  // Calculate totals
  const totalClicks = data.reduce((sum, item) => sum + item.total_clicks, 0);
  const totalSignups = data.reduce((sum, item) => sum + (item.users_signed_up || 0), 0);
  const totalPaperSessions = data.reduce((sum, item) => sum + (item.users_with_first_paper || 0), 0);
  const totalAutoTrades = data.reduce((sum, item) => sum + (item.users_with_first_auto_trade || 0), 0);

  // Get experiments
  const experiments = Array.from(
    new Set(
      data
        .filter((item) => item.experiment_key)
        .map((item) => item.experiment_key!)
    )
  );

  // Filter data
  let filteredData = data;
  if (selectedExperiment) {
    filteredData = filteredData.filter((item) => item.experiment_key === selectedExperiment);
  }
  if (showExperimentsOnly) {
    filteredData = filteredData.filter((item) => item.experiment_key !== null);
  }

  // Group by tracking_id for main table
  const groupedByTracking = filteredData.reduce((acc, item) => {
    if (!acc[item.tracking_id]) {
      acc[item.tracking_id] = {
        tracking_id: item.tracking_id,
        total_clicks: 0,
        unique_users: 0,
        routes: new Set<string>(),
        locales: new Set<string>(),
        funnel_stages: new Set<string>(),
        users_signed_up: 0,
        users_with_first_paper: 0,
        users_with_first_auto_trade: 0,
      };
    }
    acc[item.tracking_id].total_clicks += item.total_clicks;
    acc[item.tracking_id].unique_users += item.unique_users;
    acc[item.tracking_id].routes.add(item.route);
    acc[item.tracking_id].locales.add(item.locale);
    if (item.funnel_stage) {
      acc[item.tracking_id].funnel_stages.add(item.funnel_stage);
    }
    acc[item.tracking_id].users_signed_up += item.users_signed_up || 0;
    acc[item.tracking_id].users_with_first_paper += item.users_with_first_paper || 0;
    acc[item.tracking_id].users_with_first_auto_trade += item.users_with_first_auto_trade || 0;
    return acc;
  },
  {} as Record<
    string,
    {
      tracking_id: string;
      total_clicks: number;
      unique_users: number;
      routes: Set<string>;
      locales: Set<string>;
      funnel_stages: Set<string>;
      users_signed_up: number;
      users_with_first_paper: number;
      users_with_first_auto_trade: number;
    }
  >);

  const sortedData = Object.values(groupedByTracking).sort(
    (a, b) => b.total_clicks - a.total_clicks
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-blue-600" />
            Marketing CTA Analytics
          </h1>
          <p className="text-slate-600 mt-2">
            Se hvilke call-to-actions som konverterer best
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MousePointer className="w-4 h-4 inline mr-2" />
              Oversikt
            </button>
            <button
              onClick={() => setActiveTab('funnel')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
                activeTab === 'funnel'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Target className="w-4 h-4 inline mr-2" />
              Funnel
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <MousePointer className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-slate-600">Totale klikk</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalClicks.toLocaleString()}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span className="text-sm font-medium text-slate-600">Signups</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalSignups.toLocaleString()}</p>
            {totalClicks > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {((totalSignups / totalClicks) * 100).toFixed(1)}% konvertering
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <Zap className="w-5 h-5 text-amber-600" />
              <span className="text-sm font-medium text-slate-600">Paper-sessions</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalPaperSessions.toLocaleString()}</p>
            {totalSignups > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {((totalPaperSessions / totalSignups) * 100).toFixed(1)}% aktivering
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-slate-600">Auto-trade</span>
            </div>
            <p className="text-3xl font-bold text-slate-900">{totalAutoTrades.toLocaleString()}</p>
            {totalPaperSessions > 0 && (
              <p className="text-xs text-slate-500 mt-1">
                {((totalAutoTrades / totalPaperSessions) * 100).toFixed(1)}% upgrade
              </p>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">Periode:</span>
            </div>
            <div className="flex gap-2">
              {timeRanges.map((range) => (
                <button
                  key={range.value}
                  onClick={() => handleRangeChange(range.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedRange === range.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {range.label}
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-slate-300" />

            <label className="flex items-center gap-2 cursor-pointer">
              <Filter className="w-4 h-4 text-slate-500" />
              <input
                type="checkbox"
                checked={showExperimentsOnly}
                onChange={(e) => setShowExperimentsOnly(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span className="text-sm font-medium text-slate-700">Kun eksperimenter</span>
            </label>

            {experiments.length > 0 && (
              <>
                <div className="w-px h-6 bg-slate-300" />
                <div className="flex items-center gap-2">
                  <Beaker className="w-4 h-4 text-slate-500" />
                  <select
                    value={selectedExperiment || ''}
                    onChange={(e) => setSelectedExperiment(e.target.value || null)}
                    className="px-3 py-2 rounded-lg border border-slate-300 text-sm"
                  >
                    <option value="">Alle eksperimenter</option>
                    {experiments.map((exp) => (
                      <option key={exp} value={exp}>
                        {exp}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <button
              onClick={() => fetchData(selectedRange)}
              disabled={loading}
              className="ml-auto flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Oppdater
            </button>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">
              {activeTab === 'funnel' ? 'Funnel-målinger per CTA' : 'CTA-ytelse per tracking ID'}
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-500">Laster data...</div>
          ) : sortedData.length === 0 ? (
            <div className="p-12 text-center text-slate-500">Ingen data funnet for valgt periode</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Tracking ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Funnel
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Klikk
                    </th>
                    {activeTab === 'funnel' && (
                      <>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Signups
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Rate
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Paper
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                          Auto-trade
                        </th>
                      </>
                    )}
                    {activeTab === 'overview' && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Unike brukere
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {sortedData.map((item) => (
                    <tr key={item.tracking_id} className="hover:bg-slate-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {item.tracking_id}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {Array.from(item.funnel_stages).map((stage) => (
                            <span
                              key={stage}
                              className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded capitalize"
                            >
                              {stage}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-lg font-semibold text-slate-900">
                          {item.total_clicks.toLocaleString()}
                        </span>
                      </td>
                      {activeTab === 'funnel' && (
                        <>
                          <td className="px-6 py-4 text-right">
                            <span className="font-medium text-emerald-600">
                              {item.users_signed_up.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="text-sm font-medium text-slate-700">
                              {item.total_clicks > 0
                                ? `${((item.users_signed_up / item.total_clicks) * 100).toFixed(1)}%`
                                : '-'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-medium text-amber-600">
                              {item.users_with_first_paper.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-medium text-purple-600">
                              {item.users_with_first_auto_trade.toLocaleString()}
                            </span>
                          </td>
                        </>
                      )}
                      {activeTab === 'overview' && (
                        <td className="px-6 py-4 text-right">
                          <span className="text-lg font-semibold text-emerald-600">
                            {item.unique_users.toLocaleString()}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
