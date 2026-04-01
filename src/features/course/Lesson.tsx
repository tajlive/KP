export function Lesson({ title, content }: { title: string; content: string }) {
  return (
    <div className="bg-white border border-kp-border rounded-xl p-6 shadow-sm mb-6">
      <h2 className="text-2xl font-semibold mb-3">{title}</h2>
      <p className="text-kp-dark/80 leading-relaxed whitespace-pre-line">{content}</p>
    </div>
  );
}
