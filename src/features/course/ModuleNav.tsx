export function ModuleNav({ modules }: { modules: string[] }) {
  return (
    <ul className="mb-10 space-y-2">
      {modules.map((m) => (
        <li key={m} className="text-kp-primary hover:text-kp-primary/80 transition cursor-pointer">
          {m}
        </li>
      ))}
    </ul>
  );
}
