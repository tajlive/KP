import type { Meta, StoryObj } from '@storybook/react';

// TrustStrip komponent for Storybook (client versjon uten next-intl)
const TrustStripClient = ({ locale = 'no' }: { locale?: string }) => {
  const isEnglish = locale === 'en';
  
  return (
    <section className="w-full bg-white border-b border-slate-100 py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* STATS ROW — 2 cols on mobile, 4 cols on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8 mb-8 sm:mb-12">
          {/* Stat 1: Users */}
          <div className="text-center">
            <div className="text-xs sm:text-sm text-slate-600 font-medium mb-1">
              {isEnglish ? 'Users' : 'Brukere'}
            </div>
            <div className="text-xl sm:text-2xl font-black text-slate-900">
              500K+
            </div>
            <div className="text-xs text-slate-500 mt-1">{isEnglish ? 'Worldwide' : 'Verden over'}</div>
          </div>

          {/* Stat 2: TrustPilot */}
          <div className="text-center">
            <div className="text-xs sm:text-sm text-slate-600 font-medium mb-1">
              ⭐ {isEnglish ? 'TrustScore' : 'TrustScore'}
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-500">
              4.9/5
            </div>
            <div className="text-xs text-slate-500 mt-1">1,234 reviews</div>
          </div>

          {/* Stat 3: Paper Capital */}
          <div className="text-center">
            <div className="text-xs sm:text-sm text-slate-600 font-medium mb-1">
              {isEnglish ? 'Paper Capital' : 'Paper Capital'}
            </div>
            <div className="text-xl sm:text-2xl font-black text-green-600">
              {isEnglish ? '$10K' : 'kr 100K'}
            </div>
            <div className="text-xs text-slate-500 mt-1">{isEnglish ? 'Start free' : 'Start gratis'}</div>
          </div>

          {/* Stat 4: Auto-Trading */}
          <div className="text-center">
            <div className="text-xs sm:text-sm text-slate-600 font-medium mb-1">
              {isEnglish ? 'Auto-Trading' : 'Auto-Trading'}
            </div>
            <div className="text-xl sm:text-2xl font-black text-blue-600">
              24/7
            </div>
            <div className="text-xs text-slate-500 mt-1">{isEnglish ? 'Around the clock' : 'Døgnet rundt'}</div>
          </div>
        </div>

        {/* PAYMENT LOGOS */}
        <div className="border-t border-slate-100 pt-8 sm:pt-12">
          <div className="text-xs text-slate-600 font-medium text-center mb-4">
            {isEnglish ? 'Secure payment with' : 'Sikker betaling med'}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8">
            {/* Vipps */}
            <div className="relative h-6 sm:h-8 w-auto flex items-center">
              <span className="text-xs font-bold text-slate-700">Vipps</span>
            </div>

            {/* Apple Pay */}
            <div className="relative h-6 sm:h-8 w-auto flex items-center">
              <span className="text-xs font-bold text-slate-700">Apple Pay</span>
            </div>

            {/* Stripe */}
            <div className="relative h-6 sm:h-8 w-auto flex items-center">
              <span className="text-xs font-bold text-slate-700">Stripe</span>
            </div>

            {/* PayPal */}
            <div className="relative h-6 sm:h-8 w-auto flex items-center">
              <span className="text-xs font-bold text-slate-700">PayPal</span>
            </div>

            {/* TrustPilot */}
            <div className="relative h-6 sm:h-8 w-auto flex items-center">
              <span className="text-xs font-bold text-slate-700">TrustPilot</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const meta: Meta<typeof TrustStripClient> = {
  title: 'Landing/TrustStrip',
  component: TrustStripClient,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'TrustStrip viser tillitssignaler med statistikk og betalingsikoner rett under hero-seksjonen.',
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

export const WithDarkBackground: Story = {
  args: {
    locale: 'no',
  },
  parameters: {
    backgrounds: {
      default: 'dark',
    },
  },
  decorators: [
    (Story) => (
      <div className="p-8 bg-[#0F1118]">
        <Story />
      </div>
    ),
  ],
};
