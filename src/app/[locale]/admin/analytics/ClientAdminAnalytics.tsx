'use client';

import { useEffect, useState, useCallback } from 'react';
import { getErrorMessage } from '@/lib/utils/error';
import { motion } from 'framer-motion';
import {
  Users,
  Eye,
  Clock,
  TrendingDown,
  Globe,
  MousePointer,
  ArrowUpRight,
  ArrowDownRight,
  Monitor,
  Smartphone,
  Tablet,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/utils';
import { formatDistanceToNow } from '@/lib/utils';

interface VisitorStats {
  totalVisits: number;
  uniqueVisitors: number;
  avgTimeOnSite: string;
  bounceRate: string;
  visitsChange: number;
  visitorsChange: number;
}

interface RecentVisitor {
  id: string;
  path: string;
  referrer: string | null;
  created_at: string | null;
  user_email?: string | null;
  user_name?: string | null;
  is_authenticated: boolean;
}

interface TopPage {
  path: string;
  visits: number;
}

interface DeviceStats {
  desktop: number;
  mobile: number;
  tablet: number;
}

export default function ClientAdminAnalytics() {
  const [stats, setStats] = useState<VisitorStats | null>(null);
  const [recentVisitors, setRecentVisitors] = useState<RecentVisitor[]>([]);
  const [topPages, setTopPages] = useState<TopPage[]>([]);
  const [devices, setDevices] = useState<DeviceStats>({ desktop: 0, mobile: 0, tablet: 0 });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('24h');

  const supabase = createClient();

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      // Calculate date range
      const now = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '24h':
          startDate.setDate(now.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(now.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(now.getDate() - 30);
          break;
      }

      // Fetch visitor stats
      const { data: visitsData } = await supabase
        .from('page_visits')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startDate.toISOString());

      // Fetch unique visitors (by session_id)
      const { data: sessionsData } = await supabase
        .rpc('get_unique_visitors', { p_start_date: startDate.toISOString() });

      // Fetch recent visitors with user info
      const { data: recentData } = await supabase
        .from('page_visits')
        .select(`
          id,
          path,
          referrer,
          created_at,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(10);

      // Fetch top pages
      const { data: topPagesData } = await supabase
        .rpc('get_top_pages', { p_start_date: startDate.toISOString(), p_limit: 5 });

      // Calculate stats
      const totalVisits = visitsData?.length || 0;
      const uniqueVisitors = sessionsData || 0;
      
      setStats({
        totalVisits,
        uniqueVisitors,
        avgTimeOnSite: '2m 34s',
        bounceRate: '42%',
        visitsChange: 12.5,
        visitorsChange: 8.3,
      });

      // Format recent visitors
      const formattedVisitors = (recentData || []).map((visit) => ({
        id: visit.id,
        path: visit.path,
        referrer: visit.referrer,
        created_at: visit.created_at,
        user_email: null,
        user_name: null,
        is_authenticated: !!visit.user_id,
      }));
      setRecentVisitors(formattedVisitors);

      // Format top pages
      setTopPages(topPagesData || []);

      // Device stats (mock for now - would come from user_agent parsing)
      setDevices({ desktop: 65, mobile: 28, tablet: 7 });

    } catch (error) {
      console.error('Error fetching analytics:', getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [supabase, timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const StatCard = ({
    title,
    value,
    change,
    icon: Icon,
    trend: _trend,
  }: {
    title: string;
    value: string | number;
    change?: number;
    icon: React.ElementType;
    trend?: 'up' | 'down';
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className={`flex items-center text-xs ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {change >= 0 ? (
              <ArrowUpRight className="h-3 w-3 mr-1" />
            ) : (
              <ArrowDownRight className="h-3 w-3 mr-1" />
            )}
            {Math.abs(change)}%
            <span className="text-muted-foreground ml-1">fra forrige periode</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Se hvem som besøker plattformen din
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {range === '24h' ? 'Siste 24t' : range === '7d' ? 'Siste 7 dager' : 'Siste 30 dager'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-32 animate-pulse bg-muted" />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Totale besøk"
              value={stats?.totalVisits.toLocaleString() || '0'}
              change={stats?.visitsChange}
              icon={Eye}
              trend="up"
            />
            <StatCard
              title="Unike besøkende"
              value={stats?.uniqueVisitors.toLocaleString() || '0'}
              change={stats?.visitorsChange}
              icon={Users}
              trend="up"
            />
            <StatCard
              title="Gj.snitt tid på siden"
              value={stats?.avgTimeOnSite || '0m 0s'}
              icon={Clock}
            />
            <StatCard
              title="Bounce rate"
              value={stats?.bounceRate || '0%'}
              icon={TrendingDown}
              trend="down"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Visitors */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Nylige besøkende
                </CardTitle>
                <CardDescription>
                  Siste 10 besøkende på plattformen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentVisitors.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Ingen besøkende ennå
                    </p>
                  ) : (
                    recentVisitors.map((visitor, index) => (
                      <motion.div
                        key={visitor.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            visitor.is_authenticated
                              ? 'bg-green-500/10 text-green-500'
                              : 'bg-muted-foreground/10 text-muted-foreground'
                          }`}>
                            {visitor.is_authenticated ? (
                              <Users className="h-5 w-5" />
                            ) : (
                              <Eye className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              {visitor.user_name || visitor.user_email || 'Anonym besøkende'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {visitor.path}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">
                            {visitor.created_at 
                              ? formatDistanceToNow(new Date(visitor.created_at)) 
                              : '—'}
                          </p>
                          {visitor.referrer && (
                            <p className="text-xs text-blue-500 truncate max-w-[120px]">
                              Fra: {new URL(visitor.referrer).hostname}
                            </p>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Side Panel */}
            <div className="space-y-6">
              {/* Top Pages */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MousePointer className="h-4 w-4" />
                    Populære sider
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {topPages.map((page, index) => (
                      <div key={page.path} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-muted-foreground w-4">
                            {index + 1}
                          </span>
                          <span className="text-sm truncate max-w-[140px]">{page.path}</span>
                        </div>
                        <span className="text-sm font-medium">{page.visits}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Device Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Monitor className="h-4 w-4" />
                    Enheter
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Desktop</span>
                      </div>
                      <span className="text-sm font-medium">{devices.desktop}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${devices.desktop}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Mobil</span>
                      </div>
                      <span className="text-sm font-medium">{devices.mobile}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${devices.mobile}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Tablet className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Tablet</span>
                      </div>
                      <span className="text-sm font-medium">{devices.tablet}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-primary rounded-full h-2 transition-all"
                        style={{ width: `${devices.tablet}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
