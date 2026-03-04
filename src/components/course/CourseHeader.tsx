export function CourseHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-10">
      <h1 className="text-4xl font-bold mb-4">{title}</h1>
      <p className="text-lg text-kp-dark/80">{description}</p>
    </div>
  );
}
