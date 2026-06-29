import type { Meta, StoryObj } from '@storybook/react';
import { Check } from 'lucide-react';

// HeroSection komponent for Storybook (client versjon uten server dependencies)
const HeroSectionClient = ({ locale = 'no' }: { locale?: string }) => {
  const isEnglish = locale === 'en';
  
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-[#0052FF] to-[#1e40af] px-4 sm:px-6 lg:px-8"
    >
      {/* Desktop decorative elements */}
      <div
        className="pointer-events-none absolute -top-32 right-0 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl hidden lg:block"
        style={{
          background: `radial-gradient(circle, #0052FF 0%, transparent 70%)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-[360px] w-[360px] rounded-full opacity-25 blur-3xl hidden lg:block"
        style={{
          background: 'radial-gradient(circle, rgba(56,189,248,0.5) 0%, transparent 70%)',
        }}
        aria-hidden
      />

      <div className="relative z-10 max-w-6xl mx-auto w-full py-16 sm:py-20 lg:py-32">
        {/* RESPONSIVE GRID: 1-col mobile, 2-col desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* LEFT: Copy */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/10 text-white text-xs sm:text-sm font-semibold mb-4 sm:mb-6 rounded-full"
            >
              <svg
                className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              </svg>
              <span className="truncate">{isEnglish ? 'Norway\'s first crypto trading school' : 'Norges første krypto-trading skole'}</span>
            </div>

            {/* H1 */}
            <h1 className="text-3xl sm:text-4xl lg:text-6xl font-black text-white mb-4 sm:mb-6 leading-tight">
              {isEnglish ? 'Learn crypto trading' : 'Lær krypto-trading'}
              <br />
              <span className="inline-block">
                <span className="text-blue-200">{isEnglish ? 'with ' : 'med '}</span>
                <span className="text-white underline decoration-4 decoration-yellow-400">{isEnglish ? 'play money' : 'lekepenger'}</span>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg lg:text-xl text-blue-50 mb-4 sm:mb-6 leading-relaxed">
              {isEnglish 
                ? 'Practice with $10,000 in virtual capital. No risk, lots of learning.' 
                : 'Praksis med kr 100,000 i virtuell kapital. Ingen risiko, mye læring.'}
            </p>

            {/* Bullets/features */}
            <p className="text-sm sm:text-base lg:text-lg text-blue-100/90 mb-6 sm:mb-8 max-w-2xl mx-auto lg:mx-0">
              ✓ {isEnglish ? 'Paper trading with realistic market conditions' : 'Lekepenger med realistiske markedsforhold'}
              <br />
              ✓ {isEnglish ? 'Auto-trading with your own strategies' : 'Auto-trading med egne strategier'}
              <br />
              ✓ {isEnglish ? 'Free courses and guides' : 'Gratis kurs og veiledninger'}
            </p>

            {/* CTA BUTTONS */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:justify-center lg:justify-start">
              <button className="px-6 py-3 bg-white text-[#0052FF] font-bold rounded-xl hover:bg-blue-50 transition-colors">
                {isEnglish ? 'Get started free' : 'Kom i gang gratis'}
              </button>
              <button className="px-6 py-3 border-2 border-white text-white font-bold rounded-xl hover:bg-white/10 transition-colors">
                {isEnglish ? 'See demo' : 'Se demo'}
              </button>
            </div>
          </div>

          {/* RIGHT: Mockup — HIDDEN ON MOBILE */}
          <div className="relative hidden lg:flex lg:items-center lg:justify-center">
            {/* Browser mockup container */}
            <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl shadow-[#0052FF]/15 ring-1 ring-white/20 overflow-hidden transform hover:scale-[1.01] transition-transform duration-300">
              {/* Browser chrome */}
              <div className="bg-slate-900 px-3 sm:px-4 py-3 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500" />
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 ml-2 sm:ml-4 bg-slate-800 rounded px-2 sm:px-3 py-1 min-w-0">
                  <span className="text-slate-400 text-xs font-mono truncate block">
                    app.klarpakke.no/handel
                  </span>
                </div>
              </div>

              {/* Dashboard preview */}
              <div className="bg-gradient-to-br from-slate-50 to-blue-50 p-4 sm:p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-3 sm:mb-4 gap-2">
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 font-medium">Paper Balance</div>
                    <div className="text-xl sm:text-2xl font-black text-slate-900 mt-1 tabular-nums tracking-tight">
                      {isEnglish ? '$ 10,324' : 'kr 103,247'}
                    </div>
                  </div>
                  <div className="shrink-0 inline-flex items-center gap-1 px-2 sm:px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold">
                    <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" strokeWidth={2.5} aria-hidden />
                    <span className="hidden sm:inline">Risk-free</span>
                  </div>
                </div>

                {/* Mini chart */}
                <div className="bg-white rounded-xl p-3 sm:p-4 mb-3 border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-700">BTC/USDT</span>
                    <span className="text-xs text-slate-500 tabular-nums">1H</span>
                  </div>
                  <svg viewBox="0 0 200 60" className="w-full h-14 sm:h-16" aria-hidden>
                    <defs>
                      <linearGradient id="heroMockupChartFill" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#0052FF" stopOpacity="0.35" />
                        <stop offset="100%" stopColor="#0052FF" stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M 0,45 L 25,40 L 50,42 L 75,30 L 100,25 L 125,28 L 150,18 L 175,15 L 200,12 L 200,60 L 0,60 Z"
                      fill="url(#heroMockupChartFill)"
                    />
                    <path
                      d="M 0,45 L 25,40 L 50,42 L 75,30 L 100,25 L 125,28 L 150,18 L 175,15 L 200,12"
                      stroke="#0052FF"
                      strokeWidth="2"
                      fill="none"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                </div>

                {/* Mini stats */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">24h High</span>
                    <span className="font-mono text-slate-900 font-semibold">$68,450</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-600">24h Low</span>
                    <span className="font-mono text-slate-900 font-semibold">$62,100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const meta: Meta<typeof HeroSectionClient> = {
  title: 'Landing/HeroSection',
  component: HeroSectionClient,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'HeroSection er landingssidens hovedseksjon med CTA, mockup og verdiforslag.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    locale: {
      control: 'select',
      options: ['no', 'en'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    locale: 'no',
  },
};

export const English: Story = {
  args: {
    locale: 'en',
  },
};

export const MobileViewport: Story = {
  args: {
    locale: 'no',
  },
  parameters: {
    viewport: {
      defaultViewport: 'mobile',
    },
  },
};

export const TabletViewport: Story = {
  args: {
    locale: 'no',
  },
  parameters: {
    viewport: {
      defaultViewport: 'tablet',
    },
  },
};

export const DesktopViewport: Story = {
  args: {
    locale: 'no',
  },
  parameters: {
    viewport: {
      defaultViewport: 'desktop',
    },
  },
};
