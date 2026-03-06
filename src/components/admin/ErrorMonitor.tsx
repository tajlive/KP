'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, RefreshCw, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ClientError {
  id: string;
  error_type: string;
  error_message: string;
  page_url: string;
  browser: string;
  device_type: string;
  severity: string;
  resolved: boolean;
  created_at: string;
}

interface ErrorStats {
  total_errors: number;
  critical_errors: number;
  unresolved_errors: number;
  errors_last_hour: number;
}

export function ErrorMonitor() {
  const [errors, setErrors] = useState<ClientError[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'critical'>('all');

  const fetchErrors = async () => {
    try {
      const res = await fetch('/api/admin/errors');
      if (res.ok) {
        const data = await res.json();
        setErrors(data.errors || []);
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error('Failed to fetch errors:', err);
    } finally {
      setLoading(false);
    }
  };

  const resolveError = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/errors/${id}/resolve`, { method: 'POST' });
      if (res.ok) {
        setErrors(prev => prev.map(e => e.id === id ? { ...e, resolved: true } : e));
      }
    } catch (err) {
      console.error('Failed to resolve error:', err);
    }
  };

  useEffect(() => {
    fetchErrors();
    // Refresh every 30 seconds
    const interval = setInterval(fetchErrors, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredErrors = errors.filter(e => {
    if (filter === 'unresolved') return !e.resolved;
    if (filter === 'critical') return e.severity === 'critical';
    return true;
  });

  if (loading) {
    return (
      <div className="bg-slate-900 rounded-xl p-6 border border-slate-800">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="w-6 h-6 text-blue-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-800">
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Client Errors
          </h3>
          <Button variant="outline" size="sm" onClick={fetchErrors}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-white">{stats.total_errors}</div>
              <div className="text-xs text-slate-400">Total (24h)</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-red-400">{stats.critical_errors}</div>
              <div className="text-xs text-slate-400">Critical</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-yellow-400">{stats.unresolved_errors}</div>
              <div className="text-xs text-slate-400">Unresolved</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-400">{stats.errors_last_hour}</div>
              <div className="text-xs text-slate-400">Last hour</div>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b border-slate-800 flex items-center gap-2">
        <Filter className="w-4 h-4 text-slate-400" />
        {(['all', 'unresolved', 'critical'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Error List */}
      <div className="max-h-[400px] overflow-y-auto">
        {filteredErrors.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
            <p>No errors found</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredErrors.slice(0, 20).map((error) => (
              <div
                key={error.id}
                className={`p-4 hover:bg-slate-800/30 transition-colors ${
                  error.resolved ? 'opacity-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        error.severity === 'critical'
                          ? 'bg-red-500/20 text-red-400'
                          : error.severity === 'warning'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {error.error_type}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(error.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-white truncate mb-1">
                      {error.error_message}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {error.page_url} • {error.browser} • {error.device_type}
                    </p>
                  </div>
                  {!error.resolved && (
                    <button
                      onClick={() => resolveError(error.id)}
                      className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                      title="Mark as resolved"
                    >
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
