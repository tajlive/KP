export function Progress({ value }: { value: number }) {
  return (
    <div className="w-full bg-kp-bg-secondary border border-kp-border rounded-lg h-4 mb-6">
      <div
        className="bg-kp-blue h-full rounded-lg transition-all"
        style={{ width: `${value}%` }}
      />
    </div>
  );
}
