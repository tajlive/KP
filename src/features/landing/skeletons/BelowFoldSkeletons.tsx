"use client";

import { Skeleton } from "@/shared/ui/skeleton";

function DemoWidgetSkeleton() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="pt-4 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
          <Skeleton className="h-[300px] lg:h-[400px] rounded-2xl" />
        </div>
      </div>
    </section>
  );
}

function CoursePreviewSkeleton() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 lg:mb-12">
          <Skeleton className="h-8 w-64 mx-auto mb-4" />
          <Skeleton className="h-4 w-96 mx-auto" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ThreeStepsSkeleton() {
  return (
    <section className="py-12 sm:py-16 lg:py-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 lg:mb-12">
          <Skeleton className="h-8 w-48 mx-auto mb-4" />
        </div>
        <div className="grid sm:grid-cols-3 gap-6 lg:gap-8">
          {[1, 2, 3].map((i) => (
            <div key={i} className="text-center space-y-3">
              <Skeleton className="h-16 w-16 rounded-full mx-auto" />
              <Skeleton className="h-5 w-32 mx-auto" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LandingTransparencySkeleton() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Skeleton className="h-8 w-64 mx-auto mb-6" />
        <Skeleton className="h-4 w-full mb-3" />
        <Skeleton className="h-4 w-5/6 mx-auto mb-3" />
        <Skeleton className="h-4 w-4/6 mx-auto mb-8" />
        <Skeleton className="h-12 w-48 mx-auto" />
      </div>
    </section>
  );
}

function FinalCTASkeleton() {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-blue-600 to-indigo-700">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <Skeleton className="h-10 w-3/4 mx-auto mb-6 bg-white/20" />
        <Skeleton className="h-5 w-full max-w-lg mx-auto mb-4 bg-white/20" />
        <Skeleton className="h-5 w-4/5 max-w-md mx-auto mb-8 bg-white/20" />
        <Skeleton className="h-14 w-56 mx-auto bg-white/30" />
      </div>
    </section>
  );
}

export {
  DemoWidgetSkeleton,
  CoursePreviewSkeleton,
  ThreeStepsSkeleton,
  LandingTransparencySkeleton,
  FinalCTASkeleton,
};
