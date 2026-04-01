interface LogoProps {
  className?: string;
}

export function Logo({ className = "" }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-lg">K</span>
      </div>
      <span className="font-bold text-xl text-slate-900 dark:text-white">
        Klarpakke
      </span>
    </div>
  );
}
