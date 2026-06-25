"use client";

import dynamic from "next/dynamic";
import { ScrollReveal } from "./ScrollReveal";
import {
  DemoWidgetSkeleton,
  CoursePreviewSkeleton,
  ThreeStepsSkeleton,
  FinalCTASkeleton,
} from "./skeletons/BelowFoldSkeletons";

const LeaderboardPreview = dynamic(
  () => import("./LeaderboardPreview").then((mod) => mod.LeaderboardPreview),
  {
    loading: () => <div className="h-96 bg-kp-bg-primary animate-pulse" />,
    ssr: false,
  },
);

const DemoWidget = dynamic(
  () => import("./DemoWidget").then((mod) => mod.DemoWidget),
  {
    loading: () => <DemoWidgetSkeleton />,
    ssr: false,
  },
);

const CoursePreview = dynamic(
  () => import("./CoursePreview").then((mod) => mod.CoursePreview),
  {
    loading: () => <CoursePreviewSkeleton />,
    ssr: false,
  },
);

const ThreeSteps = dynamic(
  () => import("./ThreeSteps").then((mod) => mod.ThreeSteps),
  {
    loading: () => <ThreeStepsSkeleton />,
    ssr: false,
  },
);

const FeaturesBentoGrid = dynamic(
  () => import("./FeaturesBentoGrid").then((mod) => mod.FeaturesBentoGrid),
  {
    loading: () => <div className="h-96 bg-kp-bg-primary animate-pulse" />,
    ssr: false,
  },
);

const FinalCTASection = dynamic(() => import("./FinalCTASection"), {
  loading: () => <FinalCTASkeleton />,
  ssr: false,
});

export function BelowFoldSections() {
  return (
    <>
      <ScrollReveal direction="up" delay={0.1}>
        <LeaderboardPreview />
      </ScrollReveal>

      <ScrollReveal direction="up" delay={0.1}>
        <DemoWidget />
      </ScrollReveal>

      <ScrollReveal direction="up" delay={0.1}>
        <CoursePreview />
      </ScrollReveal>

      <ScrollReveal direction="up" delay={0.1}>
        <section id="land-steg" className="scroll-mt-24 max-w-6xl mx-auto px-4">
          <ThreeSteps />
        </section>
      </ScrollReveal>

      <ScrollReveal direction="up" delay={0.1}>
        <FeaturesBentoGrid />
      </ScrollReveal>

      <ScrollReveal direction="up" delay={0.1}>
        <FinalCTASection />
      </ScrollReveal>
    </>
  );
}
