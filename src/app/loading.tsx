/**
 * Root loading state
 * Shows while page content is loading
 */

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#0a0b0d] flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
    </div>
  );
}
