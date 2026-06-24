
/**
 * @deprecated Use `src/shared/ui/marketing/FeatureGrid` instead.
 */
interface Step {
  number: string;
  title: string;
  description: string;
}

interface GettingStartedStepsProps {
  steps?: Step[];
  title?: string;
}

const defaultSteps: Step[] = [
  {
    number: "01",
    title: "Opprett konto",
    description: "Registrer deg gratis på under 2 minutter. Ingen kredittkort nødvendig.",
  },
  {
    number: "02",
    title: "Start paper-trading",
    description: "Få umiddelbar tilgang til 100 000 kr i lekepenger og alle våre verktøy.",
  },
  {
    number: "03",
    title: "Bli klar for live",
    description: "Når du er komfortabel, oppgrader til ekte trading med ett klikk.",
  },
];

export function GettingStartedSteps({ 
  steps = defaultSteps,
  title = "Kom i gang på 3 enkle steg"
}: GettingStartedStepsProps) {
  return (
    <section className="py-20 bg-slate-100 dark:bg-slate-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">
            {title}
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative text-center">
              <div className="text-5xl font-black text-slate-200 dark:text-slate-800 mb-4">
                {step.number}
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {step.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
