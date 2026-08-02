
export default function OnboardingLoading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-kp-bg-primary">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-16 h-16 bg-kp-brand rounded-2xl" />
        <div className="h-6 w-40 bg-kp-bg-tertiary rounded-lg" />
        <div className="h-4 w-56 bg-kp-bg-tertiary rounded-lg" />
      </div>
    </div>
  );
}
