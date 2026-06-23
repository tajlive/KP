import type { Meta, StoryObj } from "@storybook/react";
import { NextIntlClientProvider } from "next-intl";
import { MobileTradingCard } from "../mobile-trading-card";

const messages = {
  trading: {
    shares: "shares",
    avg: "avg",
    buy: "Buy",
    sell: "Sell",
  },
};

const meta: Meta<typeof MobileTradingCard> = {
  title: "Mobile/MobileTradingCard",
  component: MobileTradingCard,
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={messages}>
        <div className="bg-[#0a0b0d] p-4">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof MobileTradingCard>;

const base = {
  symbol: "BTCUSDT",
  name: "Bitcoin",
  quantity: 0.05,
  avgPrice: 48_000,
  currentPrice: 50_000,
  changePercent: 4.17,
};

export const Profit: Story = {
  args: {
    ...base,
    sparklineData: [48_000, 48_500, 49_000, 49_500, 50_000],
    dayLow: 47_000,
    dayHigh: 51_000,
  },
};

export const Loss: Story = {
  args: {
    ...base,
    currentPrice: 45_000,
    changePercent: -6.25,
    sparklineData: [48_000, 47_000, 46_000, 45_500, 45_000],
  },
};

export const NoSparkline: Story = {
  args: base,
};
