/**
 * Locale-level loading state
 * Shows while localized page content is loading
 */

export default function LocaleLoading() {
  return (
    <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Laster...</p>
      </div>
    </div>
  );
}
