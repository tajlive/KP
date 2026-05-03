
export default function OnboardingLoading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-950">
      <div className="flex flex-col items-center gap-4 animate-pulse">
        <div className="w-16 h-16 bg-blue-200 dark:bg-blue-900 rounded-2xl" />
        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800 rounded-lg" />
        <div className="h-4 w-56 bg-gray-200 dark:bg-gray-800 rounded-lg" />
      </div>
    </div>
  );
}
