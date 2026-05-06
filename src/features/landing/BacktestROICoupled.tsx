import dynamic from 'next/dynamic';
import { ScrollReveal } from './ScrollReveal';

const ROISimulator = dynamic(
  () => import("./ROISimulator").then((mod) => mod.ROISimulator),
  {
    loading: () => <div className="h-96 bg-kp-bg-primary animate-pulse" />,
  }
);

export function BacktestROICoupled() {
  return (
    <ScrollReveal direction="up" delay={0.1}>
      <ROISimulator />
    </ScrollReveal>
  );
}
