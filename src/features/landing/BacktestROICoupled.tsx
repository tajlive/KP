'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';
import { ScrollReveal } from './ScrollReveal';
import type { LandingBacktestTeaserRef } from './LandingBacktestTeaser';

const ROISimulator = dynamic(
  () => import("./ROISimulator").then((mod) => mod.ROISimulator),
  {
    loading: () => <div className="h-96 bg-kp-bg-primary animate-pulse" />,
  }
);

const LandingBacktestTeaser = dynamic(
  () => import("./LandingBacktestTeaser").then((mod) => mod.LandingBacktestTeaser),
  {
    loading: () => <div className="h-96 bg-kp-bg-primary animate-pulse" />,
  }
);

export function BacktestROICoupled() {
  const backtestRef = useRef<LandingBacktestTeaserRef>(null);

  return (
    <>
      <ScrollReveal direction="up" delay={0.1}>
        <ROISimulator backtestRef={backtestRef} />
      </ScrollReveal>
      
      <ScrollReveal direction="up" delay={0.1}>
        <LandingBacktestTeaser ref={backtestRef} />
      </ScrollReveal>
    </>
  );
}
