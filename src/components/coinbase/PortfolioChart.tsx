"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, XAxis, YAxis } from "recharts";
import { Card } from "@coinbase/cds-web/cards";
import { HStack } from "@coinbase/cds-web/layout";
import { Button } from "@coinbase/cds-web/buttons";
import { Text } from "@coinbase/cds-web/typography";
import { ChartWrapper } from "@/components/ui/chart-wrapper";

const ranges = ["24H", "7D", "1M", "3M", "1Y", "ALL"] as const;
type Range = (typeof ranges)[number];

function mockSeries(seedValue: number, points: number) {
  const out: Array<{ i: number; value: number }> = [];
  let current = Math.max(seedValue, 1);
  for (let i = 0; i < points; i += 1) {
    const drift = Math.sin(i / 3) * 0.006 + (Math.random() - 0.5) * 0.008;
    current = Math.max(1, current * (1 + drift));
    out.push({ i, value: Math.round(current) });
  }
  return out;
}

export function PortfolioChart({
  baseValue,
  locale,
}: {
  baseValue: number;
  locale: string;
}) {
  const [range, setRange] = useState<Range>("7D");
  const points = range === "24H" ? 24 : range === "7D" ? 30 : 60;

  const data = useMemo(
    () => mockSeries(baseValue, points),
    [baseValue, points],
  );

  return (
    <Card className="border border-slate-200 bg-white p-6 shadow-sm">
      <HStack className="items-center justify-between">
        <Text as="h2" className="text-lg font-semibold text-slate-900">
          {locale === "no" ? "Porteføljeutvikling" : "Portfolio performance"}
        </Text>
        <HStack className="gap-1">
          {ranges.map((item) => (
            <Button
              key={item}
              variant={item === range ? "primary" : "secondary"}
              compact
              onClick={() => setRange(item)}
            >
              {item}
            </Button>
          ))}
        </HStack>
      </HStack>
      <div className="mt-4 h-72 w-full">
        <ChartWrapper height={288}>
          <AreaChart
            data={data}
            margin={{ left: 0, right: 0, top: 8, bottom: 8 }}
          >
            <defs>
              <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0052FF" stopOpacity={0.22} />
                <stop offset="95%" stopColor="#0052FF" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis dataKey="i" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#0052FF"
              fill="url(#portfolioFill)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ChartWrapper>
      </div>
    </Card>
  );
}
