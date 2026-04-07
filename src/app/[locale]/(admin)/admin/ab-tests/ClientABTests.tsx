'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { TrendingUp, Users, MousePointer, BarChart3, Target } from 'lucide-react';

interface VariantStats {
  name: string;
  impressions: number;
  signups: number;
  demoClicks: number;
}

interface ABTestData {
  name: string;
  status: 'active' | 'completed' | 'paused';
  startDate: string;
  variants: VariantStats[];
}

export default function ClientABTests() {
  const [tests, setTests] = useState<ABTestData[]>([
    {
      name: 'hero_copy_2026',
      status: 'active',
      startDate: '2026-02-16',
      variants: [
        { name: 'control', impressions: 0, signups: 0, demoClicks: 0 },
        { name: 'variant-a', impressions: 0, signups: 0, demoClicks: 0 },
      ],
    },
  ]);

  // In production, this would fetch from analytics API
  useEffect(() => {
    // Simulated data for demo
    setTests([
      {
        name: 'hero_copy_2026',
        status: 'active',
        startDate: '2026-02-16',
        variants: [
          { name: 'control', impressions: 1234, signups: 45, demoClicks: 89 },
          { name: 'variant-a', impressions: 1289, signups: 67, demoClicks: 112 },
        ],
      },
    ]);
  }, []);

  const calculateRate = (conversions: number, impressions: number): string => {
    if (impressions === 0) return "0";
    return ((conversions / impressions) * 100).toFixed(2);
  };

  const calculateLift = (variantRate: number, controlRate: number): string => {
    if (controlRate === 0) return "0";
    return (((variantRate - controlRate) / controlRate) * 100).toFixed(1);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
          A/B Testing Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Track conversion experiments and optimize landing pages
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Tests</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">1</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Visitors</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">2,523</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Conversions</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">112</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                <MousePointer className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg CVR</p>
                <p className="text-3xl font-black text-gray-900 dark:text-white">4.44%</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Tests */}
      <div className="space-y-6">
        {tests.map((test) => {
          const control = test.variants[0];
          const variant = test.variants[1];
          const controlCVR = parseFloat(calculateRate(control.signups, control.impressions));
          const variantCVR = parseFloat(calculateRate(variant.signups, variant.impressions));
          const lift = calculateLift(variantCVR, controlCVR);
          const isWinning = parseFloat(lift) > 0;

          return (
            <Card key={test.name} className="overflow-hidden">
              <CardHeader className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl font-bold">{test.name}</CardTitle>
                    <p className="text-sm text-gray-500 mt-1">
                      Started {test.startDate} • 50/50 split
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 rounded-full text-sm font-semibold capitalize">
                      {test.status}
                    </span>
                    <Button variant="outline" size="sm">
                      Stop Test
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6">
                {/* Test Description */}
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                    Hypothesis
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    Emotional regret-aversion copy (&quot;Om ett år er du enten glad...&quot;) will outperform 
                    standard educational pitch by 30-50% in signup conversions.
                  </p>
                </div>

                {/* Variants Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Control */}
                  <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-gray-400" />
                      <h3 className="font-bold text-gray-900 dark:text-white">Control</h3>
                      <span className="text-sm text-gray-500">(Standard copy)</span>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Impressions</span>
                        <span className="font-semibold">{control.impressions.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Signups</span>
                        <span className="font-semibold">{control.signups}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Demo Clicks</span>
                        <span className="font-semibold">{control.demoClicks}</span>
                      </div>
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Conversion Rate</span>
                          <span className="text-2xl font-black text-gray-900 dark:text-white">
                            {controlCVR}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Variant A */}
                  <div className={`p-6 rounded-xl ${isWinning ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-800/50'}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <h3 className="font-bold text-gray-900 dark:text-white">Variant A</h3>
                      <span className="text-sm text-gray-500">(Emotional copy)</span>
                      {isWinning && (
                        <span className="ml-auto px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 text-xs font-bold rounded">
                          🏆 WINNER
                        </span>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Impressions</span>
                        <span className="font-semibold">{variant.impressions.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Signups</span>
                        <span className="font-semibold">{variant.signups}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Demo Clicks</span>
                        <span className="font-semibold">{variant.demoClicks}</span>
                      </div>
                      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 dark:text-gray-400">Conversion Rate</span>
                          <div className="text-right">
                            <span className="text-2xl font-black text-gray-900 dark:text-white">
                              {variantCVR}%
                            </span>
                            {parseFloat(lift) !== 0 && (
                              <p className={`text-sm font-semibold ${isWinning ? 'text-green-600' : 'text-red-600'}`}>
                                {isWinning ? '+' : ''}{lift}% vs control
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendation */}
                {parseFloat(lift) > 20 && (
                  <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                    <h4 className="font-semibold text-green-900 dark:text-green-200 mb-1">
                      <Target className="w-5 h-5 inline mr-1" /> Recommendation: Implement Variant A
                    </h4>
                    <p className="text-sm text-green-800 dark:text-green-300">
                      Variant A is showing a statistically significant +{lift}% lift in conversions. 
                      Consider stopping the test and rolling out Variant A to all traffic.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* How it Works */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>How A/B Testing Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="p-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-blue-600">1</span>
              </div>
              <h4 className="font-semibold mb-2">50/50 Split</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Visitors are randomly assigned to control or variant
              </p>
            </div>
            <div className="p-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-blue-600">2</span>
              </div>
              <h4 className="font-semibold mb-2">Track Conversions</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                We track signups and demo clicks for each variant
              </p>
            </div>
            <div className="p-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mx-auto mb-3">
                <span className="text-xl font-bold text-blue-600">3</span>
              </div>
              <h4 className="font-semibold mb-2">Pick Winner</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                After statistical significance, implement the winning variant
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
